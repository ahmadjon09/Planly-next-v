import mongoose from 'mongoose'

const User = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String },
  role: { type: String, required: true },
  owner: { type: Boolean, default: false },
  password: { type: String, required: true },
  isLoggedIn: { type: Boolean, default: false },
  telegramId: { type: String, default: "" },
})

export default mongoose.model('Users', User)
