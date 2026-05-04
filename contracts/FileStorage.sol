 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract FileStorage {
    struct File {
        string cid;
        string fileName;
        string pin;
        address owner;
        uint256 timestamp;
    }

    File[] private files;

    event FileUploaded(
        address indexed owner,
        string cid,
        string fileName,
        string pin,
        uint256 timestamp
    );

    function uploadFile(
        string calldata cid,
        string calldata fileName,
        string calldata pin
    ) external {
        require(bytes(cid).length > 0, "CID required");
        require(bytes(fileName).length > 0, "File name required");
        require(bytes(pin).length > 0, "PIN required");

        files.push(
            File({
                cid: cid,
                fileName: fileName,
                pin: pin,
                owner: msg.sender,
                timestamp: block.timestamp
            })
        );

        emit FileUploaded(
            msg.sender,
            cid,
            fileName,
            pin,
            block.timestamp
        );
    }

    function verifyFile(
        string calldata cid,
        string calldata pin
    ) external view returns (bool) {
        for (uint256 i = 0; i < files.length; i++) {
            if (
                keccak256(abi.encodePacked(files[i].cid)) ==
                keccak256(abi.encodePacked(cid)) &&
                keccak256(abi.encodePacked(files[i].pin)) ==
                keccak256(abi.encodePacked(pin))
            ) {
                return true;
            }
        }
        return false;
    }

    function getMyFiles() external view returns (File[] memory) {
        uint256 count = 0;

        for (uint256 i = 0; i < files.length; i++) {
            if (files[i].owner == msg.sender) {
                count++;
            }
        }

        File[] memory myFiles = new File[](count);
        uint256 idx = 0;

        for (uint256 i = 0; i < files.length; i++) {
            if (files[i].owner == msg.sender) {
                myFiles[idx] = files[i];
                idx++;
            }
        }

        return myFiles;
    }
}