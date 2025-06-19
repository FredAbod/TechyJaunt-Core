import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      ref: 'User',
    },
    recipient: {
      type: String,
      ref: 'User',
    },
    paymentMethod: {
      type: String,
      default: "Wallet to wallet transaction"
    },
    amount: {
      type: Number,
      required: true
    },
    transactionType: {
      type: String,
      enum: ["Deposit", "Withdrawal"]
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'PENDING'],
      default: 'PENDING'
    },
    remark: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model("WalletTransaction", walletTransactionSchema);
