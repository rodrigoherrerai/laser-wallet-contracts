import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer, Wallet } from "ethers";
import {
  walletSetup,
  factorySetup,
  encodeFunctionData,
  initTests,
  sign,
  signTypedData
} from "../utils";
import { userOp, types } from "../types";

const mock = ethers.Wallet.createRandom().address;
const {
  abi
} = require("../../artifacts/contracts/LaserWallet.sol/LaserWallet.json");

describe("Setup", () => {
  let owner: Signer;
  let ownerAddress: string;
  let guardians: string[];
  let entryPoint: string;
  let _guardian1: Signer;
  let _guardian2: Signer;

  beforeEach(async () => {
    [owner, _guardian1, _guardian2] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    guardians = [await _guardian1.getAddress(), await _guardian2.getAddress()];
    const EP = await ethers.getContractFactory("TestEntryPoint");
    const _entryPoint = await EP.deploy(mock, 0, 0);
    entryPoint = _entryPoint.address;
  });

  describe("Utils", () => {
    it("should return correct signer if v is adjusted to 31", async () => {
      const { address, wallet } = await walletSetup(
        ownerAddress,
        guardians,
        entryPoint
      );
      const hash = ethers.utils.keccak256("0x1234");
      const sig = await sign(owner, hash);
      const signer = await wallet.returnSigner(hash, sig);
      expect(signer).to.equal(ownerAddress);
    });

    it("should return correct signer by signing typed data", async () => {
      const { address, wallet } = await walletSetup(
        ownerAddress,
        guardians,
        entryPoint
      );
      const randomSigner = ethers.Wallet.createRandom();
      // This is just to check the signature, it is mocking a transaction only
      // for the purposes of the Utils contract (not an actual transaction).
      userOp.sender = address;
      userOp.nonce = 0;
      userOp.callData = "0x";
      const domain = {
        chainId: (await wallet.getChainId()).toString(),
        verifyingContract: address
      };
      console.log(userOp);
      const txMessage = {
        sender: userOp.sender,
        nonce: userOp.nonce,
        callData: userOp.callData,
        callGas: userOp.callGas,
        verificationGas: userOp.verificationGas,
        preVerificationGas: userOp.preVerificationGas,
        maxFeePerGas: userOp.maxFeePerGas,
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
        paymaster: userOp.paymaster,
        paymasterData: userOp.paymasterData
      };
      const hash = await wallet.userOperationHash(userOp);
      const sig1 = await sign(randomSigner, hash);
      const sig2 = await randomSigner._signTypedData(domain, types, txMessage);
      const signer = await wallet.returnSigner(hash, sig1);
      const signer2 = await wallet.returnSigner(hash, sig2);
      console.log("signer: ", signer);
      console.log("signer2: ", signer2);
      console.log(randomSigner.address);
    });

    it("should correctly split 'v', 'r', and 's' ", async () => {
      const { address, wallet } = await walletSetup(
        ownerAddress,
        guardians,
        entryPoint
      );
      const hash = ethers.utils.keccak256("0x1234");
      const sig = await sign(owner, hash);
      const [r, s, v] = await wallet.splitSig(sig);
      expect(r).to.equal(sig.slice(0, 66));
      expect(s).to.equal(`0x${sig.slice(66, 130)}`);
      expect(v).to.equal(parseInt(sig.slice(130), 16));
    });

    it("should revert if the recovered signer is address(0)", async () => {
      const { address, wallet } = await walletSetup(
        ownerAddress,
        guardians,
        entryPoint
      );
      const hash = ethers.utils.keccak256("0x1234");
      const sig = (await sign(owner, hash)).replace(/1f$/, "03");
      await expect(wallet.returnSigner(hash, sig)).to.be.reverted;
    });
  });
});
