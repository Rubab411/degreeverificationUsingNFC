const MOFARequest = require("../models/mofa_model");

// 🟢 Create MOFA Request
const createMOFARequest = async (req, res) => {
  try {
    const request = await MOFARequest.create(req.body);
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟢 Get All MOFA Requests
const getMOFARequests = async (req, res) => {
  try {
    const requests = await MOFARequest.find();
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟢 Approve / Reject MOFA Request
const updateMOFAStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, verifiedBy } = req.body;

    const request = await MOFARequest.findById(id);
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

module.exports = { createMOFARequest, getMOFARequests, updateMOFAStatus };
