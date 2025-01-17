// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

/**
 * @param sender The wallet making the operation (should be address(this)).
 * @param nonce Anti-replay parameter; also used as the salt for first-time wallet creation.
 * @param initCode The initCode of the wallet (only needed if the wallet is not yet on-chain and needs to be created).
 * @param callData The data to pass to the sender during the main execution call.
 * @param callGas The amount of gas to allocate the main execution call.
 * @param verificationGas The amount of gas to allocate for the verification step.
 * @param preVerificationGas The amount of gas to pay to compensate the bundler for the pre-verification execution and calldata.
 * @param maxFeePerGas Maximum fee per gas (similar to EIP 1559  max_fee_per_gas).
 * @param maxPriorityFeePerGas Maximum priority fee per gas (similar to EIP 1559 max_priority_fee_per_gas).
 * @param paymaster Address sponsoring the transaction (or zero for regular self-sponsored transactions).
 * @param paymasterData Extra data to send to the paymaster.
 * @param signature Data passed into the wallet along with the nonce during the verification step.
 */
struct UserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    uint256 callGas;
    uint256 verificationGas;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    address paymaster;
    bytes paymasterData;
    bytes signature;
}

library UserOperationLib {
    function requiredGas(UserOperation calldata userOp)
        internal
        pure
        returns (uint256)
    {
        unchecked {
            //when using a Paymaster, the verificationGas is used also to cover the postOp call.
            // our security model might call postOp eventually twice
            uint256 mul = userOp.paymaster != address(0) ? 1 : 3;
            return
                userOp.callGas +
                userOp.verificationGas *
                mul +
                userOp.preVerificationGas;
        }
    }

    function requiredPreFund(UserOperation calldata userOp)
        internal
        pure
        returns (uint256 prefund)
    {
        unchecked {
            return requiredGas(userOp) * userOp.maxFeePerGas;
        }
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }
}
