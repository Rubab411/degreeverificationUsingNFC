const IBCCRequest = require("../models/ibcc_model");

// 🟢 Create IBCC Request
const createIBCCRequest = async (req, res) => {
  try {
    const request = await IBCCRequest.create(req.body);
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟢 Get All IBCC Requests
const getIBCCRequests = async (req, res) => {
  try {
    const requests = await IBCCRequest.find();
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟢 Approve / Reject IBCC Request
const updateIBCCStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, verifiedBy } = req.body;

    const request = await IBCCRequest.findById(id);
    if (!request) return res.status(404).json({ msg: "Request not found" });

    request.status = status;
    request.verifiedBy = verifiedBy;
    request.verifiedAt = new Date();
    await request.save();

    res.status(200).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createIBCCRequest, getIBCCRequests, updateIBCCStatus };
