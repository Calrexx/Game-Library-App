class ApiError extends Error {
    constructor (mesaj, durum = 500){
        super(mesaj);
        this.durum = durum;
    }
}

module.exports = ApiError;