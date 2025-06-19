import mongoose from 'mongoose';
const Decimal = mongoose.Decimal128;

// Define Wallet schema
const walletSchema = new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      
    },
    balance: {
      type: Number,
      default: 0
    },
    virtualAccountNumber: { type: String },
    virtualAccountName: {type: String},
    virtualAccountBank: {type: String},
    virtualAccountBankCode: {type: String},
    accountReference:{type:String},
    transactions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    }]
  });
  

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
