const errorHandler = (err, req, res, next) => {
    console.error(`[Error Handler] ${req.method} ${req.originalUrl}:`, err.stack || err.message);

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error occurred.',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = { errorHandler };
