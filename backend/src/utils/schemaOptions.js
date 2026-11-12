/** toJSON settings shared by every schema: run getters (money -> number), add virtuals, drop __v. */
export const jsonOptions = { getters: true, virtuals: true, versionKey: false };

/** Options for top-level schemas. */
export const baseOptions = { timestamps: true, id: false, toJSON: jsonOptions };

/** Options for embedded sub-schemas that keep their own _id. */
export const subOptions = { id: false, toJSON: jsonOptions };

/** Options for embedded value objects without an _id. */
export const valueOptions = { _id: false, id: false, toJSON: jsonOptions };
