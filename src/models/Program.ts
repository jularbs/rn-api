import { prop, getModelForClass, modelOptions, index, pre, DocumentType, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import slugify from "slugify";

export interface IProgram {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  day: number[];
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  station: Ref<Types.ObjectId>; // Reference to Station model
  isActive: boolean;
  image?: Ref<Types.ObjectId>; // Reference to Media model
  createdAt: Date;
  updatedAt: Date;

  // Virtual fields
  isOnAir: boolean;
  timeSlot: string;
  formattedDuration: string;
}

// Pre-hook to generate slug from name if not provided
@pre<Program>("save", function (this: DocumentType<Program>) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });
  }

  // Calculate duration if not provided
  if (this.startTime && this.endTime && !this.duration) {
    const start = this.parseTime(this.startTime);
    const end = this.parseTime(this.endTime);

    let duration = end - start;
    if (duration < 0) {
      duration += 24 * 60; // Handle overnight programs
    }

    this.duration = duration;
  }
})
@index({ name: 1 })
@index({ day: 1 })
@index({ startTime: 1 })
@index({ station: 1 })
@index({ isActive: 1 })
@index({ createdAt: -1 })
@index({ day: 1, startTime: 1 }) // Compound index for schedule queries
@modelOptions({
  schemaOptions: {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
})
export class Program {
  @prop({
    required: true,
    trim: true,
    index: true,
  })
  public name!: string;

  @prop({
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  public slug!: string;

  @prop({
    trim: true,
    maxlength: [1000, "Description cannot exceed 1000 characters"],
  })
  public description?: string;

  @prop({
    required: true,
    type: () => [Number],
    validate: {
      validator: function (days: number[]) {
        return days && days.length > 0 && days.every((day) => day >= 0 && day <= 6);
      },
      message: "Day array must contain numbers between 0-6 (Sunday=0, Monday=1, ..., Saturday=6)",
    },
    index: true,
  })
  public day!: number[];

  @prop({
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Start time must be in HH:MM format (24-hour)"],
    index: true,
  })
  public startTime!: string;

  @prop({
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "End time must be in HH:MM format (24-hour)"],
  })
  public endTime!: string;

  @prop({
    min: [1, "Duration must be at least 1 minute"],
    max: [1440, "Duration cannot exceed 24 hours (1440 minutes)"],
  })
  public duration!: number;

  @prop({
    ref: "Station",
    required: true,
    index: true,
  })
  public station!: Ref<Types.ObjectId>;

  @prop({
    default: true,
    index: true,
  })
  public isActive!: boolean;

  @prop({
    ref: "Media",
  })
  public image?: Ref<Types.ObjectId>;

  public createdAt!: Date;
  public updatedAt!: Date;

  // Helper method to parse time string to minutes
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  }

  // Virtual to check if program is currently on air
  public get isOnAir(): boolean {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    if (this.day.includes(currentDay)) {
      const currentMinutes = this.parseTime(currentTime);
      const startMinutes = this.parseTime(this.startTime);
      const endMinutes = this.parseTime(this.endTime);

      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        // Overnight program
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
    }

    return false;
  }

  // Virtual for formatted time slot
  public get timeSlot(): string {
    return `${this.startTime} - ${this.endTime}`;
  }

  // Virtual for formatted duration
  public get formattedDuration(): string {
    const hours = Math.floor(this.duration / 60);
    const minutes = this.duration % 60;

    if (hours === 0) {
      return `${minutes} min`;
    } else if (minutes === 0) {
      return `${hours} hr`;
    } else {
      return `${hours} hr ${minutes} min`;
    }
  }

  // Static method to find active programs
  public static findActive() {
    return ProgramModel.find({ isActive: true });
  }

  // Static method to find programs by day (accepts day number 0-6 or day name)
  public static findByDay(dayInput: string | number) {
    let dayNumber: number;

    if (typeof dayInput === "string") {
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      dayNumber = dayNames.indexOf(dayInput.toLowerCase());
      if (dayNumber === -1) {
        throw new Error("Invalid day name. Use sunday, monday, tuesday, wednesday, thursday, friday, or saturday");
      }
    } else {
      dayNumber = dayInput;
      if (dayNumber < 0 || dayNumber > 6) {
        throw new Error("Day number must be between 0-6 (Sunday=0, Saturday=6)");
      }
    }

    return ProgramModel.find({ day: dayNumber, isActive: true }).sort({ startTime: 1 });
  }

  // Static method to find programs by station
  public static findByStation(stationId: string | Types.ObjectId) {
    return ProgramModel.find({ station: stationId, isActive: true }).populate("station image");
  }

  // Static method to find programs by time range
  public static findByTimeRange(startTime: string, endTime: string) {
    return ProgramModel.find({
      $or: [
        { startTime: { $gte: startTime, $lte: endTime } },
        { endTime: { $gte: startTime, $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
      ],
      isActive: true,
    });
  }

  // Static method to find currently airing programs
  public static findCurrentlyAiring() {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    return ProgramModel.find({
      day: currentDay,
      isActive: true,
    }).populate("station image");
  }

  // Static method to search programs
  public static search(query: string) {
    return ProgramModel.find({
      $or: [{ name: { $regex: query, $options: "i" } }, { description: { $regex: query, $options: "i" } }],
      isActive: true,
    }).populate("station image");
  }

  // Static method to get schedule for a specific day and station
  public static getSchedule(dayInput: string | number, stationId?: string | Types.ObjectId) {
    let dayNumber: number;

    if (typeof dayInput === "string") {
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      dayNumber = dayNames.indexOf(dayInput.toLowerCase());
      if (dayNumber === -1) {
        throw new Error("Invalid day name. Use sunday, monday, tuesday, wednesday, thursday, friday, or saturday");
      }
    } else {
      dayNumber = dayInput;
      if (dayNumber < 0 || dayNumber > 6) {
        throw new Error("Day number must be between 0-6 (Sunday=0, Saturday=6)");
      }
    }

    const filter: Record<string, unknown> = {
      day: dayNumber,
      isActive: true,
    };

    if (stationId) {
      filter.station = stationId;
    }

    return ProgramModel.find(filter).sort({ startTime: 1 }).populate("station image");
  }

  // Static method to get weekly schedule
  public static getWeeklySchedule(stationId?: string | Types.ObjectId) {
    const filter: Record<string, unknown> = { isActive: true };

    if (stationId) {
      filter.station = stationId;
    }

    return ProgramModel.find(filter).sort({ day: 1, startTime: 1 }).populate("station image");
  }

  // Static method to get program statistics
  public static async getProgramStats() {
    const stats = await ProgramModel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalPrograms: { $sum: 1 },
          avgDuration: { $avg: "$duration" },
        },
      },
    ]);

    return (
      stats[0] || {
        totalPrograms: 0,
        avgDuration: 0,
      }
    );
  }

  // Static method to find programs with conflicts (overlapping times)
  public static async findTimeConflicts(stationId?: string | Types.ObjectId) {
    const filter: Record<string, unknown> = { isActive: true };
    if (stationId) {
      filter.station = stationId;
    }

    const programs = await ProgramModel.find(filter).sort({ startTime: 1 });
    const conflicts: { program1: unknown; program2: unknown }[] = [];

    // Helper function to parse time
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };

    for (let i = 0; i < programs.length; i++) {
      for (let j = i + 1; j < programs.length; j++) {
        const prog1 = programs[i];
        const prog2 = programs[j];

        // Check if programs share any common days and same station
        const hasCommonDay = prog1.day.some((day) => prog2.day.includes(day));

        if (hasCommonDay && prog1.station?.toString() === prog2.station?.toString()) {
          const start1 = parseTime(prog1.startTime);
          const end1 = parseTime(prog1.endTime);
          const start2 = parseTime(prog2.startTime);
          const end2 = parseTime(prog2.endTime);

          if ((start1 < end2 && end1 > start2) || (start2 < end1 && end2 > start1)) {
            conflicts.push({ program1: prog1, program2: prog2 });
          }
        }
      }
    }

    return conflicts;
  }
}

export const ProgramModel = getModelForClass(Program);
