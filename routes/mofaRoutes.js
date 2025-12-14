const express = require("express");
const router = express.Router();
const { createMOFARequest, getMOFARequests, updateMOFAStatus } = require("../controller/mofaController");

router.post("/", createMOFARequest);
router.get("/", getMOFARequests);
router.put("/:id", updateMOFAStatus);

module.exports = router;
