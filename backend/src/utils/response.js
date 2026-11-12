/** Success envelope: { success: true, data, message? } */
export function ok(res, data = {}, message, status = 200) {
  const body = { success: true, data };
  if (message) body.message = message;
  return res.status(status).json(body);
}

export const created = (res, data, message) => ok(res, data, message, 201);

/** Paginated list payload: { items, total, page, pages, limit } */
export function listPayload(items, total, page, limit) {
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)), limit };
}

export const skipFor = (page, limit) => (page - 1) * limit;
