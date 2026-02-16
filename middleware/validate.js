export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error?.issues?.map(e => e.message) || ["Invalid request"];
    return res.status(400).json({
      status: 400,
      message: "Validation failed",
      errors
    });
  }

  req.body = result.data;
  next();
};
