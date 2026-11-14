const logger = (req,res,next) => {
    const method = req.method;
    const url = req.url;
    const ip = req.ip || req.connection.remoteAddress;

    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${ip}`);

    next();

}
module.exports = logger;