import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    notification:  {
        type: String,
        required: true,
    }, userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
},{
    timestamps: true,
    versionKey:false
  });

  const Notification = mongoose.model("Notification",notificationSchema);

  export default Notification;