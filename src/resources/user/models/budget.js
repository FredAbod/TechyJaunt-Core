import mongoose from "mongoose";

const Schema = mongoose.Schema;
const Decimal = mongoose.Decimal128;

// const DurationSchema = new Schema({
//   weeks: {
//     type: Number,
//     required: true,
//     min: 0,
//   },
//   months: {
//     type: Number,
//     required: true,
//     min: 0,
//   },
// });

// DurationSchema.virtual('duration').get(function() {
//   const weeks = this.weeks;
//   const months = this.months;

//   const days = weeks * 7 + months * 30; // approximate number of days

//   let durationString = '';

//   if (months > 0) {
//     durationString += `${months} month${months > 1 ? 's' : ''} `;
//   }

//   if (weeks > 0) {
//     durationString += `${weeks} week${weeks > 1 ? 's' : ''} `;
//   }

//   durationString += `${days % 30} day${days % 30 !== 1 ? 's' : ''}`;

//   return durationString.trim();
// });

const BudgetSchema = new Schema({
  budgetName: {
    type: String,
    required: true,
    // enum: ["Housing", "Shopping", "Miscellaneous", "Transportation", "Utilities & Bills", "Phone and Internet", "HealthCare", "Custom"],
  },
  // customBudgetName: String,
  duration: { 
    type: String,
    required: true,
  },
  icon: { 
    type: String,
    required: true,
  },
  amount: {
    type: Decimal,
    required: true,
    min: 0,
  },
  initialAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  totalWithdrawal: {
    type: Number,
    min: 0,
  },
  budgetBalance: {
    type: Number,
    min: 0,
  },
  isActive:{
    type:Boolean,
    default: true
       },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
},
{
  timestamps: true,
  versionKey: false,
});

const Budget = mongoose.model('Budget', BudgetSchema);

export default Budget;
