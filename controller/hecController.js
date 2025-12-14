const HECRequest = require("../models/hec_model");

// 🟢 Create HEC Request
const createHECRequest = async (req, res) => {
  try {
    const request = await HECRequest.create(req.body);
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟢 Get All HEC Requests
const getHECRequests = async (req, res) => {
  try {
    const requests = await HECRequest.find();
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟢 Approve / Reject HEC Request
const updateHECStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, verifiedBy } = req.body;

    const request = await HECRequest.findById(id);
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

module.exports = { createHECRequest, getHECRequests, updateHECStatus };
