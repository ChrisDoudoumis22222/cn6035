import { Schema, model, Document, Types } from '@supabase/supabase-js';

export interface IBooking extends Document {
  user: Types.ObjectId;
  date: Date;
  partySize: number;
  createdAt: Date;
}

const BookingSchema = new Schema<IBooking>({
  user:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date:      { type: Date, required: true },
  partySize: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default model<IBooking>('Booking', BookingSchema);
