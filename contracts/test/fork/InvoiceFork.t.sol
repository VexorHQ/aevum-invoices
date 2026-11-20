// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Invoice} from "../../src/Invoice.sol";
import {Signing} from "../Signing.sol";

interface ITUSD8 is IERC20 {
    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function authorizationState(address, bytes32) external view returns (bool);
}

/// @notice Runs Invoice against the REAL tUSD8 on a local fork of Aevum testnet. No funds needed:
///         `deal` writes a balance into the fork only.
///         Run with: make test-fork   (or: forge test --match-path 'test/fork/*' --fork-url aevum --evm-version shanghai)
contract InvoiceForkTest is Test {
    ITUSD8 constant TUSD8 = ITUSD8(0x456569838f1d43009A91ebA4263147Afd7233483);

    address merchant = makeAddr("merchant");
    address buyer;
    uint256 buyerKey;
    address relayer = makeAddr("relayer");
    Invoice invoice;

    uint256 constant AMOUNT = 5e6; // 5 tUSD8

    function setUp() public {
        (buyer, buyerKey) = makeAddrAndKey("buyer");
        invoice = new Invoice(TUSD8);
        deal(address(TUSD8), buyer, 10e6);
    }

    function test_realTusd8_approveAndPay() public {
        vm.prank(merchant);
        bytes32 id = invoice.createInvoice(AMOUNT, buyer, block.timestamp + 7 days, "Fork invoice #1");

        vm.startPrank(buyer);
        TUSD8.approve(address(invoice), AMOUNT);
        invoice.pay(id, AMOUNT);
        vm.stopPrank();

        assertEq(TUSD8.balanceOf(merchant), AMOUNT);
        assertEq(TUSD8.balanceOf(address(invoice)), 0);
        assertTrue(invoice.isPaid(id));
        assertEq(invoice.getInvoice(id).paidBy, buyer);
    }

    function test_realTusd8_payWithAuthorization() public {
        vm.prank(merchant);
        bytes32 id = invoice.createInvoice(AMOUNT, buyer, block.timestamp + 7 days, "Fork invoice #2");

        uint256 deadline = block.timestamp + 1 hours;
        Signing.Auth memory a = Signing.Auth({
            from: buyer,
            to: address(invoice),
            value: AMOUNT,
            validAfter: 0,
            validBefore: deadline,
            nonce: invoice.authorizationNonce(id)
        });
        (uint8 v, bytes32 r, bytes32 s) = Signing.signReceive(vm, buyerKey, TUSD8.DOMAIN_SEPARATOR(), a);

        vm.prank(relayer);
        invoice.payWithAuthorization(id, buyer, AMOUNT, 0, deadline, invoice.authorizationNonce(id), v, r, s);

        assertEq(TUSD8.balanceOf(merchant), AMOUNT);
        assertEq(TUSD8.balanceOf(buyer), 5e6);
        assertTrue(invoice.isPaid(id));
        assertTrue(TUSD8.authorizationState(buyer, invoice.authorizationNonce(id)));
    }

    function test_realTusd8_wrongAmountCannotSquat() public {
        vm.prank(merchant);
        bytes32 id = invoice.createInvoice(AMOUNT, address(0), block.timestamp + 7 days, "Fork invoice #3");

        address squatter = makeAddr("squatter");
        deal(address(TUSD8), squatter, 1);
        vm.startPrank(squatter);
        TUSD8.approve(address(invoice), 1);
        vm.expectRevert(Invoice.WrongAmount.selector);
        invoice.pay(id, 1);
        vm.stopPrank();

        assertFalse(invoice.isPaid(id));
    }

    function test_realTusd8_openInvoiceAnyoneCanPay() public {
        address payer = makeAddr("anyone");
        deal(address(TUSD8), payer, 10e6);

        vm.prank(merchant);
        bytes32 id = invoice.createInvoice(AMOUNT, address(0), block.timestamp + 7 days, "Open invoice");

        vm.startPrank(payer);
        TUSD8.approve(address(invoice), AMOUNT);
        invoice.pay(id, AMOUNT);
        vm.stopPrank();

        assertTrue(invoice.isPaid(id));
        assertEq(invoice.getInvoice(id).paidBy, payer);
        assertEq(TUSD8.balanceOf(merchant), AMOUNT);
    }
}
