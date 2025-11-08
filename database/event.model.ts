import mongoose, { Document, Model, Schema } from 'mongoose';

// TypeScript interface for Event document
export interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      required: [true, 'Slug is required'],
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    overview: {
      type: String,
      required: [true, 'Overview is required'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Image is required'],
      trim: true,
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
    },
    time: {
      type: String,
      required: [true, 'Time is required'],
    },
    mode: {
      type: String,
      required: [true, 'Mode is required'],
      enum: ['online', 'offline', 'hybrid'],
      lowercase: true,
    },
    audience: {
      type: String,
      required: [true, 'Audience is required'],
      trim: true,
    },
    agenda: {
      type: [String],
      required: [true, 'Agenda is required'],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: 'Agenda must contain at least one item',
      },
    },
    organizer: {
      type: String,
      required: [true, 'Organizer is required'],
      trim: true,
    },
    tags: {
      type: [String],
      required: [true, 'Tags are required'],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: 'Tags must contain at least one item',
      },
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
  }
);

// Create unique index on slug for faster queries and uniqueness enforcement
EventSchema.index({ slug: 1 }, { unique: true });

/**
 * Pre-save hook to generate slug from title and normalize date/time
 * - Only regenerates slug if title is modified
 * - Validates and normalizes date to ISO format (YYYY-MM-DD)
 * - Ensures time is stored in consistent HH:MM format
 */
// Use pre-validate hook so slug is present before Mongoose runs validation
EventSchema.pre('validate', async function (next) {
  // Generate slug from title if title is modified or slug is missing
  if ((this.isNew && !this.slug) || this.isModified('title')) {
    const base = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

    const generateShortId = () => {
      // Generate a 6-character random string using a URL-safe alphabet
      const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
      return Array.from(
        { length: 6 },
        () => alphabet[Math.floor(Math.random() * alphabet.length)]
      ).join('');
    };

    let candidate = base || 'untitled';
    // First try without a suffix
    const Model = (this.constructor as Model<IEvent>);
    let exists = await Model.findOne({
      slug: candidate,
      _id: { $ne: this._id },
    }).lean().exec();
    
    // If conflict exists, append a short random id
    if (exists) {
      // Try up to 3 times with different random suffixes
      for (let attempts = 0; attempts < 3; attempts++) {
        candidate = `${base}-${generateShortId()}`;
        exists = await Model.findOne({
          slug: candidate,
          _id: { $ne: this._id },
        }).lean().exec();
        if (!exists) break;
      }
      
      // If we still have a conflict after 3 attempts, use timestamp + random
      if (exists) {
        const timestamp = Date.now().toString(36);
        candidate = `${base}-${timestamp}${generateShortId()}`;
      }
    }
    
    this.slug = candidate;
  }

  // Normalize date (preserve calendar date regardless of server timezone)
  if (this.isModified('date')) {
    if (typeof this.date !== 'string') {
      throw new Error('Date must be a string in YYYY-MM-DD format');
    }
    // Match YYYY-MM-DD
    const m = this.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) {
      throw new Error('Date must be in YYYY-MM-DD format');
    }
    const yyyy = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const dd = parseInt(m[3], 10);

    // Construct a UTC date from components
    const utc = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (
      utc.getUTCFullYear() !== yyyy ||
      utc.getUTCMonth() + 1 !== mm ||
      utc.getUTCDate() !== dd
    ) {
      throw new Error('Invalid date components');
    }

    // Store normalized calendar date string (not toISOString())
    const mmStr = String(mm).padStart(2, '0');
    const ddStr = String(dd).padStart(2, '0');
    this.date = `${yyyy}-${mmStr}-${ddStr}`;
  }

  // Normalize time to HH:MM format
  if (this.isModified('time')) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(this.time)) {
      throw new Error('Time must be in HH:MM format');
    }
    // Ensure consistent two-digit format
    const [hours, minutes] = this.time.split(':');
    this.time = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }

  next();
});

// Prevent model recompilation during hot reloads in development
const Event: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);

export default Event;
