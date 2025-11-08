import mongoose, { Document, Model, Schema } from 'mongoose';

// TypeScript interface for Booking document
export interface IBooking extends Document {
  eventId: mongoose.Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      validate: {
        validator: (v: string) => {
          // Email validation regex
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please provide a valid email address',
      },
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
  }
);

// Create index on eventId for faster queries
BookingSchema.index({ eventId: 1 });

/**
 * Pre-save hook to verify that the referenced event exists
 * Prevents orphaned bookings by validating event reference
 */
BookingSchema.pre('save', async function (next) {
  // Only validate eventId if it's modified or document is new
  if (this.isModified('eventId')) {
    // Dynamically import Event model to avoid circular dependency issues
    const Event = mongoose.model('Event');
    
    const eventExists = await Event.exists({ _id: this.eventId });
    
    if (!eventExists) {
      throw new Error('Referenced event does not exist');
    }
  }

  next();
});

// Prevent model recompilation during hot reloads in development
const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
