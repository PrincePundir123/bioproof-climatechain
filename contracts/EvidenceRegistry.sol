// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Integrity commitments only. This contract does not certify physical truth.
contract EvidenceRegistry {
    address public immutable authority;
    struct Proof { bytes32 root; uint64 version; }
    mapping(bytes32 => Proof) public latest;
    event ProofAnchored(bytes32 indexed batchId, bytes32 indexed root, uint64 version);
    error Unauthorized();
    error InvalidProof();
    constructor(address authorizedSigner) {
        if (authorizedSigner == address(0)) revert Unauthorized();
        authority = authorizedSigner;
    }
    function anchor(bytes32 batchId, bytes32 root, uint64 version) external {
        if (msg.sender != authority) revert Unauthorized();
        if (root == bytes32(0) || version <= latest[batchId].version) revert InvalidProof();
        latest[batchId] = Proof(root, version);
        emit ProofAnchored(batchId, root, version);
    }
    function verify(bytes32 batchId, bytes32 root, uint64 version) external view returns (bool) {
        return latest[batchId].root == root && latest[batchId].version == version && version != 0;
    }
}
