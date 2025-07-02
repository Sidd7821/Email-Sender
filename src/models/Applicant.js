const mongoose = require('mongoose');

const applicantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    match: /.+\@.+\..+/
  },
  coverLetter: {
    type: String,
    required: true,
  },
  resumePath: {
    type: String,
    required: true,
  },
}, { timestamps: true });

const Applicant = mongoose.model('Applicant', applicantSchema);

module.exports = Applicant;