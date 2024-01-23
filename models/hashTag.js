class HashTag {
  constructor(creator, type, clients, title) {
    this.creator = creator;
    this.ids = clients;
    this.type = type;
    this.createdAt = new Date().getTime();
    this.title = title;
  }
}
module.exports = HashTag;
