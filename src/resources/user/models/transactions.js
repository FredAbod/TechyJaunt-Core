import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paymentMethod: {
    type: String,
  },
  amount: {
    type: Number
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  transactionReference: {
    type: String,
  },
  transactionType: {
    type: String,
    enum: ["Deposit", "Withdrawal"]
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'PENDING', 'FAILED'],
    default: 'PENDING'
  }
});

export default mongoose.model('Transaction', transactionSchema);
