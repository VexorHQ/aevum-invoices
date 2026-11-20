// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice EIP-3009 (USDC-style) signed transfers. tUSD8 on Aevum implements this.
interface IERC3009 {
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

/// @title Invoice
/// @notice Send a bill, get paid in tUSD8. A freelancer or small shop creates an invoice for an
///         exact amount and (optionally) one specific payer; anyone can read it, but only the
///         right payer, paying the exact amount, can settle it — and only once.
///
///         Two ways to pay, same result:
///         1. `pay`: the payer approves this contract, then calls `pay` (two transactions,
///            payer pays gas). The classic flow.
///         2. `payWithAuthorization`: the payer signs an EIP-3009 message off-chain and anyone
///            (your backend, a relayer, the merchant) submits it. The payer needs no native gas.
///
///         The due date is informational only. There is no on-chain expiry: an invoice stays
///         payable past its due date, and the UI works out "overdue" from `dueDate` vs the
///         current time. That keeps the contract simple and means a late payment can still
///         settle — which is usually what both sides want.
///
///         Tokens sent straight to this contract (not through `pay`) are stuck here: there is
///         no rescue function, by design. The contract is only ever meant to hold funds for
///         the few seconds between `receiveWithAuthorization` and the transfer to the merchant.
/// @dev Payment flow adapted from Aevum Starter Kit Checkout.sol (MIT, PQA Labs), with the
///      flaws the kit itself flags fixed: the amount is checked on-chain against the invoice
///      (no 1-wei front-run can mark an invoice paid), the payer is enforced when the invoice
///      names one, and the money goes to the invoice's own merchant instead of one address
///      fixed at deploy time.
contract Invoice {
    using SafeERC20 for IERC20;

    struct InvoiceData {
        address merchant;
        uint256 amount;
        address payer; // address(0) = anyone may pay
        uint256 dueDate; // informational only; no on-chain expiry
        string memo;
        bool paid;
        address paidBy;
        uint256 paidAt;
    }

    IERC20 public immutable token;

    /// @dev Invoices live here, keyed by an id nobody can guess in advance (see createInvoice).
    mapping(bytes32 invoiceId => InvoiceData) public invoices;

    /// @dev One counter per creator, mixed into every id so two invoices never collide —
    ///      not even two created by the same merchant in the same block.
    mapping(address creator => uint256 nonce) private _invoiceNonce;

    event InvoiceCreated(
        bytes32 indexed invoiceId, address indexed merchant, uint256 amount, address payer, uint256 dueDate
    );
    event InvoicePaid(bytes32 indexed invoiceId, address indexed payer, uint256 amount, uint256 paidAt);

    error WrongAmount();
    error NotPayer();
    error AlreadyPaid();
    error InvoiceNotFound();
    error InvalidNonce();
    error ZeroAmount();
    error ZeroAddress();

    constructor(IERC20 token_) {
        if (address(token_) == address(0)) revert ZeroAddress();
        token = token_;
    }

    /// @notice Create an invoice for `amount` of the token, optionally for one `payer`.
    /// @dev The id is keccak256(creator, per-creator counter, block timestamp, prevrandao).
    ///      Nobody can work it out before the invoice exists, so nobody can pay (or squat)
    ///      an invoice that hasn't been created yet. `dueDate` is informational only.
    /// @return invoiceId the new invoice's id — also in the InvoiceCreated event.
    function createInvoice(uint256 amount, address payer, uint256 dueDate, string calldata memo)
        external
        returns (bytes32 invoiceId)
    {
        if (amount == 0) revert ZeroAmount();

        uint256 nonce = _invoiceNonce[msg.sender]++;
        invoiceId = keccak256(abi.encode(msg.sender, nonce, block.timestamp, block.prevrandao));

        invoices[invoiceId] = InvoiceData({
            merchant: msg.sender,
            amount: amount,
            payer: payer,
            dueDate: dueDate,
            memo: memo,
            paid: false,
            paidBy: address(0),
            paidAt: 0
        });

        emit InvoiceCreated(invoiceId, msg.sender, amount, payer, dueDate);
    }

    /// @notice Pay `invoiceId` with tokens you have approved to this contract.
    /// @dev `amount` must match the invoice exactly — paying 1 wei to squat the invoice
    ///      (the Checkout flaw) reverts with WrongAmount, and the invoice stays open.
    function pay(bytes32 invoiceId, uint256 amount) external {
        InvoiceData storage inv = _load(invoiceId);
        _checkPayable(inv, invoiceId, msg.sender, amount);
        _settle(inv, invoiceId, msg.sender, amount);
        token.safeTransferFrom(msg.sender, inv.merchant, amount);
    }

    /// @notice Pay `invoiceId` with an EIP-3009 `ReceiveWithAuthorization` signed by `from`.
    /// @dev `nonce` must be `authorizationNonce(invoiceId)`. That ties the signature to this
    ///      invoice, so a relayer can't reuse it to settle a different one. `to` in the signed
    ///      message must be this contract. The caller (relayer) pays the gas, `from` pays the bill.
    function payWithAuthorization(
        bytes32 invoiceId,
        address from,
        uint256 amount,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        InvoiceData storage inv = _load(invoiceId);
        _checkPayable(inv, invoiceId, from, amount);
        bytes32 expectedNonce = authorizationNonce(invoiceId);
        if (nonce != expectedNonce) revert InvalidNonce();
        _settle(inv, invoiceId, from, amount);
        IERC3009(address(token)).receiveWithAuthorization(
            from, address(this), amount, validAfter, validBefore, nonce, v, r, s
        );
        token.safeTransfer(inv.merchant, amount);
    }

    /// @notice The EIP-3009 nonce a payer must sign to pay `invoiceId` through this contract.
    function authorizationNonce(bytes32 invoiceId) public view returns (bytes32) {
        return keccak256(abi.encode(address(this), invoiceId));
    }

    function getInvoice(bytes32 invoiceId) external view returns (InvoiceData memory) {
        return invoices[invoiceId];
    }

    function isPaid(bytes32 invoiceId) external view returns (bool) {
        return invoices[invoiceId].paid;
    }

    /// @dev Loads the invoice or reverts. An invoice with amount 0 can't exist: createInvoice
    ///      rejects it, so amount 0 is a reliable "never created" signal.
    function _load(bytes32 invoiceId) private view returns (InvoiceData storage inv) {
        inv = invoices[invoiceId];
        if (inv.amount == 0) revert InvoiceNotFound();
    }

    /// @dev The rules both payment paths share: one payment only, the right payer, exact amount.
    function _checkPayable(InvoiceData storage inv, bytes32 invoiceId, address payer, uint256 amount)
        private
        view
    {
        if (inv.paid) revert AlreadyPaid();
        if (inv.payer != address(0) && payer != inv.payer) revert NotPayer();
        if (amount != inv.amount) revert WrongAmount();
    }

    /// @dev Marks the invoice paid and emits the receipt. Called before any token transfer, so
    ///      a failing transfer can't leave a half-settled invoice behind.
    function _settle(InvoiceData storage inv, bytes32 invoiceId, address payer, uint256 amount) private {
        inv.paid = true;
        inv.paidBy = payer;
        inv.paidAt = block.timestamp;
        emit InvoicePaid(invoiceId, payer, amount, block.timestamp);
    }
}
