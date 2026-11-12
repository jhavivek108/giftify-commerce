import mongoose from 'mongoose';
import { ROLES } from '../utils/constants.js';
import { baseOptions, jsonOptions } from '../utils/schemaOptions.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // Never returned by queries unless explicitly selected with +passwordHash.
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true, default: '' },
    role: { type: String, enum: ROLES, default: 'customer' },
  },
  {
    ...baseOptions,
    toJSON: {
      ...jsonOptions,
      transform(doc, ret) {
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

userSchema.index({ role: 1, createdAt: -1 });

/** The only user shape that is ever sent to a client. */
userSchema.methods.toPublic = function toPublic() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
