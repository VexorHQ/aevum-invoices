// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Invoice} from "../src/Invoice.sol";
import {MockUSD8} from "../src/mocks/MockUSD8.sol";
import {Signing} from "./Signing.sol";

contract InvoiceTest is Test {
    MockUSD8 token;
    Invoice invoice;
    address merchant = makeAddr("merchant");
    address buyer;
    uint256 buyerKey;
    address stranger = makeAddr("stranger");
    address relayer = makeAddr("relayer");

    uint256 constant AMOUNT = 25e6; // 25 tUSD8
    uint256 constant DUE = 1_800_000_000; // some future date; informational only

    function setUp() public {
        (buyer, buyerKey) = makeAddrAndKey("buyer");
        token = new MockUSD8();
        invoice = new Invoice(IERC20(address(token)));
        token.mint(buyer, 100e6);
        token.mint(stranger, 100e6);
    }

    function _create(address payer) internal returns (bytes32 id) {
        vm.prank(merchant);
        id = invoice.createInvoice(AMOUNT, payer, DUE, "Logo design, March");
    }

    // ---------- createInvoice ----------

    function test_createInvoice_storesEverythingAndEmits() public {
        // The id is unguessable, so we can't predict the event arg up front; the stored
        // invoice is checked instead, and the event is covered by the pay tests.
        vm.prank(merchant);
        bytes32 id = invoice.createInvoice(AMOUNT, buyer, DUE, "Logo design, March");

        assertTrue(id != bytes32(0));
        assertTrue(id != keccak256("invoice-1"), "id must not be a guessable hash");
        Invoice.InvoiceData memory inv = invoice.getInvoice(id);
        assertEq(inv.merchant, merchant);
        assertEq(inv.amount, AMOUNT);
        assertEq(inv.payer, buyer);
        assertEq(inv.dueDate, DUE);
        assertEq(inv.memo, "Logo design, March");
        assertFalse(inv.paid);
        assertEq(inv.paidBy, address(0));
        assertEq(inv.paidAt, 0);
        assertFalse(invoice.isPaid(id));
    }

    function test_createInvoice_idsAreUnguessable() public {
        // Same merchant, same args, same block: the two ids still differ (per-creator counter).
        vm.startPrank(merchant);
        bytes32 id1 = invoice.createInvoice(AMOUNT, buyer, DUE, "one");
        bytes32 id2 = invoice.createInvoice(AMOUNT, buyer, DUE, "one");
        vm.stopPrank();
        assertTrue(id1 != id2);
    }

    function test_createInvoice_revertsOnZeroAmount() public {
        vm.prank(merchant);
        vm.expectRevert(Invoice.ZeroAmount.selector);
        invoice.createInvoice(0, buyer, DUE, "free?");
    }

    function test_constructor_rejectsZeroAddress() public {
        vm.expectRevert(Invoice.ZeroAddress.selector);
        new Invoice(IERC20(address(0)));
    }

    // ---------- pay (approve + call) ----------

    function test_pay_movesExactFundsToMerchant() public {
        bytes32 id = _create(buyer);

        vm.startPrank(buyer);
        token.approve(address(invoice), AMOUNT);
        vm.expectEmit(true, true, false, true, address(invoice));
        emit Invoice.InvoicePaid(id, buyer, AMOUNT, block.timestamp);
        invoice.pay(id, AMOUNT);
        vm.stopPrank();

        assertEq(token.balanceOf(merchant), AMOUNT, "merchant gets the exact amount");
        assertEq(token.balanceOf(address(invoice)), 0, "nothing stays in the contract");
        assertEq(token.balanceOf(buyer), 100e6 - AMOUNT);
        assertTrue(invoice.isPaid(id));
        Invoice.InvoiceData memory inv = invoice.getInvoice(id);
        assertTrue(inv.paid);
        assertEq(inv.paidBy, buyer);
        assertEq(inv.paidAt, block.timestamp);
    }

    function test_pay_revertsWrongAmount() public {
        bytes32 id = _create(buyer);

        vm.startPrank(buyer);
        token.approve(address(invoice), 2 * AMOUNT);
        vm.expectRevert(Invoice.WrongAmount.selector);
        invoice.pay(id, AMOUNT + 1);
        vm.expectRevert(Invoice.WrongAmount.selector);
        invoice.pay(id, AMOUNT - 1);
        vm.stopPrank();

        assertFalse(invoice.isPaid(id), "failed payments must not mark the invoice paid");
    }

    function test_pay_frontRunOneWeiCannotSquatInvoice() public {
        bytes32 id = _create(address(0)); // open invoice: anyone may pay, so the squat is possible in Checkout

        // The Checkout flaw: pay 1 wei to mark the invoice paid, then the real buyer is stuck.
        // Here it reverts, and the real payment still goes through afterwards.
        vm.startPrank(stranger);
        token.approve(address(invoice), 1);
        vm.expectRevert(Invoice.WrongAmount.selector);
        invoice.pay(id, 1);
        vm.stopPrank();

        assertFalse(invoice.isPaid(id));
        vm.startPrank(buyer);
        token.approve(address(invoice), AMOUNT);
        invoice.pay(id, AMOUNT);
        vm.stopPrank();
        assertTrue(invoice.isPaid(id));
        assertEq(token.balanceOf(merchant), AMOUNT);
    }

    function test_pay_revertsNotPayer() public {
        bytes32 id = _create(buyer);

        vm.startPrank(stranger);
        token.approve(address(invoice), AMOUNT);
        vm.expectRevert(Invoice.NotPayer.selector);
        invoice.pay(id, AMOUNT);
        vm.stopPrank();

        assertFalse(invoice.isPaid(id));
    }

    function test_pay_openInvoiceAnyoneCanPay() public {
        bytes32 id = _create(address(0)); // no designated payer

        vm.startPrank(stranger);
        token.approve(address(invoice), AMOUNT);
        invoice.pay(id, AMOUNT);
        vm.stopPrank();

        assertTrue(invoice.isPaid(id));
        assertEq(invoice.getInvoice(id).paidBy, stranger);
        assertEq(token.balanceOf(merchant), AMOUNT);
    }

    function test_pay_revertsAlreadyPaid() public {
        bytes32 id = _create(buyer);

        vm.startPrank(buyer);
        token.approve(address(invoice), 2 * AMOUNT);
        invoice.pay(id, AMOUNT);
        vm.expectRevert(Invoice.AlreadyPaid.selector);
        invoice.pay(id, AMOUNT);
        vm.stopPrank();
    }

    function test_pay_revertsOnUnknownInvoice() public {
        bytes32 ghost = keccak256("never-created");
        vm.prank(buyer);
        vm.expectRevert(Invoice.InvoiceNotFound.selector);
        invoice.pay(ghost, AMOUNT);
    }

    function test_pay_revertsWithoutApproval() public {
        bytes32 id = _create(buyer);
        vm.prank(buyer);
        vm.expectRevert();
        invoice.pay(id, AMOUNT);
        assertFalse(invoice.isPaid(id));
    }

    function test_pay_afterDueDateStillWorks() public {
        // Due dates are informational: no on-chain expiry.
        bytes32 id = _create(buyer);
        vm.warp(DUE + 30 days);

        vm.startPrank(buyer);
        token.approve(address(invoice), AMOUNT);
        invoice.pay(id, AMOUNT);
        vm.stopPrank();
        assertTrue(invoice.isPaid(id));
    }

    // ---------- payWithAuthorization (EIP-3009, gasless for the payer) ----------

    function _signFor(address from, uint256 key, bytes32 invoiceId, uint256 value, uint256 validBefore)
        internal
        view
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        Signing.Auth memory a = Signing.Auth({
            from: from,
            to: address(invoice),
            value: value,
            validAfter: 0,
            validBefore: validBefore,
            nonce: invoice.authorizationNonce(invoiceId)
        });
        return Signing.signReceive(vm, key, token.DOMAIN_SEPARATOR(), a);
    }

    function _sign(bytes32 invoiceId, uint256 value, uint256 validBefore)
        internal
        view
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        return _signFor(buyer, buyerKey, invoiceId, value, validBefore);
    }

    function test_payWithAuthorization_relayerSubmits() public {
        bytes32 id = _create(buyer);
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _sign(id, AMOUNT, deadline);

        vm.prank(relayer); // the buyer never sends a transaction
        invoice.payWithAuthorization(id, buyer, AMOUNT, 0, deadline, invoice.authorizationNonce(id), v, r, s);

        assertEq(token.balanceOf(merchant), AMOUNT);
        assertEq(token.balanceOf(buyer), 100e6 - AMOUNT);
        assertEq(token.balanceOf(address(invoice)), 0);
        assertTrue(invoice.isPaid(id));
        assertEq(invoice.getInvoice(id).paidBy, buyer);
        assertTrue(token.authorizationState(buyer, invoice.authorizationNonce(id)));
    }

    function test_payWithAuthorization_signatureIsBoundToInvoice() public {
        bytes32 idA = _create(buyer);
        bytes32 idB = _create(buyer);
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _sign(idA, AMOUNT, deadline);

        // Same signature, different invoice: the nonce no longer matches, so it fails here —
        // before the token is even touched.
        bytes32 nonceA = invoice.authorizationNonce(idA);
        vm.prank(relayer);
        vm.expectRevert(Invoice.InvalidNonce.selector);
        invoice.payWithAuthorization(idB, buyer, AMOUNT, 0, deadline, nonceA, v, r, s);
        assertFalse(invoice.isPaid(idB));
    }

    function test_payWithAuthorization_cannotChangeAmount() public {
        bytes32 id = _create(buyer);
        uint256 deadline = block.timestamp + 1 hours;
        // Sign an authorization whose `to` is NOT this contract: the invoice checks pass
        // (amount and payer match), so the call reaches the token — and the token rejects
        // it, because the signed message names a different payee. The signed amount can
        // never be tampered with either: the contract's WrongAmount check fires first
        // (see test_payWithAuthorization_revertsWrongAmountBeforeToken).
        Signing.Auth memory a = Signing.Auth({
            from: buyer,
            to: stranger,
            value: AMOUNT,
            validAfter: 0,
            validBefore: deadline,
            nonce: invoice.authorizationNonce(id)
        });
        (uint8 v, bytes32 r, bytes32 s) = Signing.signReceive(vm, buyerKey, token.DOMAIN_SEPARATOR(), a);
        bytes32 nonce = invoice.authorizationNonce(id);

        vm.prank(relayer);
        vm.expectRevert(MockUSD8.InvalidSignature.selector);
        invoice.payWithAuthorization(id, buyer, AMOUNT, 0, deadline, nonce, v, r, s);
        assertFalse(invoice.isPaid(id));
        assertFalse(token.authorizationState(buyer, nonce), "rejected signature must not be consumed");
    }

    function test_payWithAuthorization_revertsWrongAmountBeforeToken() public {
        // Amount mismatch against the invoice is caught by the contract, not the token.
        bytes32 id = _create(buyer);
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _sign(id, AMOUNT, deadline);

        bytes32 nonce = invoice.authorizationNonce(id);
        vm.prank(relayer);
        vm.expectRevert(Invoice.WrongAmount.selector);
        invoice.payWithAuthorization(id, buyer, AMOUNT - 1, 0, deadline, nonce, v, r, s);
    }

    function test_payWithAuthorization_revertsNotPayer() public {
        bytes32 id = _create(buyer);
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _sign(id, AMOUNT, deadline);

        // `from` is the stranger, but the invoice names the buyer — and the signature is the
        // buyer's, so this can't pass either way.
        bytes32 nonce = invoice.authorizationNonce(id);
        vm.prank(relayer);
        vm.expectRevert(Invoice.NotPayer.selector);
        invoice.payWithAuthorization(id, stranger, AMOUNT, 0, deadline, nonce, v, r, s);
        assertFalse(invoice.isPaid(id));
    }

    function test_payWithAuthorization_expired() public {
        bytes32 id = _create(buyer);
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _sign(id, AMOUNT, deadline);
        vm.warp(deadline);

        bytes32 nonce = invoice.authorizationNonce(id);
        vm.expectRevert(MockUSD8.AuthorizationExpired.selector);
        invoice.payWithAuthorization(id, buyer, AMOUNT, 0, deadline, nonce, v, r, s);
        assertFalse(invoice.isPaid(id));
    }

    function test_payWithAuthorization_noReplay() public {
        bytes32 id = _create(buyer);
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _sign(id, AMOUNT, deadline);
        bytes32 nonce = invoice.authorizationNonce(id);
        invoice.payWithAuthorization(id, buyer, AMOUNT, 0, deadline, nonce, v, r, s);

        vm.expectRevert(Invoice.AlreadyPaid.selector);
        invoice.payWithAuthorization(id, buyer, AMOUNT, 0, deadline, nonce, v, r, s);
    }

    function test_payWithAuthorization_openInvoiceAnyoneCanPay() public {
        // payer == address(0): the relayer can submit another wallet's signature.
        bytes32 id = _create(address(0));
        uint256 deadline = block.timestamp + 1 hours;
        (address other, uint256 otherKey) = makeAddrAndKey("other");
        token.mint(other, 100e6);
        (uint8 v, bytes32 r, bytes32 s) = _signFor(other, otherKey, id, AMOUNT, deadline);
        bytes32 nonce = invoice.authorizationNonce(id);

        vm.prank(relayer);
        invoice.payWithAuthorization(id, other, AMOUNT, 0, deadline, nonce, v, r, s);
        assertTrue(invoice.isPaid(id));
        assertEq(invoice.getInvoice(id).paidBy, other);
        assertEq(token.balanceOf(merchant), AMOUNT);
    }

    function testFuzz_payExactAmount(uint256 amount) public {
        amount = bound(amount, 1, 100e6);
        vm.prank(merchant);
        bytes32 id = invoice.createInvoice(amount, buyer, DUE, "fuzz");
        vm.startPrank(buyer);
        token.approve(address(invoice), amount);
        invoice.pay(id, amount);
        vm.stopPrank();
        assertEq(token.balanceOf(merchant), amount);
        assertTrue(invoice.isPaid(id));
    }
}
