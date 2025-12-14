const express = require("express");
const router = express.Router();
const { createHECRequest, getHECRequests, updateHECStatus } = require("../controller/hecController");

router.post("/", createHECRequest); // Create request
router.get("/", getHECRequests); // Get all requests
router.put("/:id", updateHECStatus); // Approve/Reject

module.exports = router;
