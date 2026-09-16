const errorHandler = (err, req, res, next) => {
    console.error(`[Error Handler] ${req.method} ${req.originalUrl}:`, err.stack || err.message);

    let clientMessage = err.message || 'Internal server error occurred.';

    // Format raw OpenSSL / Mongoose connection errors into clean messages
    if (err.message && (err.message.includes('SSL alert number 80') || err.message.includes('MongooseServerSelectionError') || err.message.includes('ssl3_read_bytes'))) {
        clientMessage = 'Database connection failed. Please ensure 0.0.0.0/0 is added in MongoDB Atlas Network Access whitelist.';
    }

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: clientMessage,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = { errorHandler };
