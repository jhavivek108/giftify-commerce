import mongoose from 'mongoose';
import { CONTACT_TYPES } from '../utils/constants.js';
import { baseOptions } from '../utils/schemaOptions.js';

const contactMessageSchema = new mongoose.Schema(
  {
    type: { type: String, enum: CONTACT_TYPES, default: 'general' },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, default: '' },
    company: { type: String, trim: true, default: '', maxlength: 120 },
    subject: { type: String, trim: true, default: '', maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    isRead: { type: Boolean, default: false },
  },
  baseOptions,
);

contactMessageSchema.index({ createdAt: -1 });

export const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
