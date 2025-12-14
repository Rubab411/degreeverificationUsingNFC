const express = require("express");
const router = express.Router();
const { createIBCCRequest, getIBCCRequests, updateIBCCStatus } = require("../controller/ibccController");

router.post("/", createIBCCRequest);
router.get("/", getIBCCRequests);
router.put("/:id", updateIBCCStatus);

module.exports = router;
