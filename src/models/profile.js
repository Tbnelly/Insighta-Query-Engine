const mongoose = require('mongoose');
const { generateUUIDv7 } = require('../utils/uuidv7');

const profileSchema = new mongoose.Schema(
  {
    id: { type: String, default: generateUUIDv7, unique: true },
    name: { type: String, required: true, unique: true, trim: true },
    gender: { type: String, required: true, enum: ['male', 'female'] },
    gender_probability: { type: Number, required: true, min: 0, max: 1 },
    age: { type: Number, required: true, min: 0 },
    age_group: { type: String, required: true, enum: ['child', 'teenager', 'adult', 'senior'] },
    country_id: { type: String, required: true, maxlength: 2, uppercase: true },
    country_name: { type: String, required: true },
    country_probability: { type: Number, required: true, min: 0, max: 1 },
    created_at: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      transform(doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    timestamps: false,
  }
);

profileSchema.index({ gender: 1 });
profileSchema.index({ age_group: 1 });
profileSchema.index({ country_id: 1 });
profileSchema.index({ age: 1 });
profileSchema.index({ gender_probability: 1 });
profileSchema.index({ country_probability: 1 });
profileSchema.index({ created_at: 1 });
profileSchema.index({ gender: 1, country_id: 1, age: 1 });

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;