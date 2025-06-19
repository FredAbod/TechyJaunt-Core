// Savings.js

import mongoose from 'mongoose';
const Decimal = mongoose.Decimal128;

const savingsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
},
  description: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
  },
  amount: {
    type: Decimal,
    required: true,
  },
  initialAmount: {
    type: Decimal
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true,
  },
  dayOfWeek: {
    type: Number,
    min: 1,
    max: 7,
    required: function () {
      return this.frequency === 'weekly';
    },
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date
  },
  interestRate: {
    type: Number,
    min: 0,
    max: 1,
    default: 0,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
  },
  isActive:{
    type:Boolean,
    default: true
       },
},{
  timestamps: true,
  versionKey:false
});

const Savings = mongoose.model('Savings', savingsSchema);

export default Savings;
