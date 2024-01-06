class Folders {
  constructor(creator, type, img) {
    this.creator = creator;
    this.ids = [];
    this.type = type;
    this.img = img;
    this.active=false;
    this.createdAt=new Date().getTime()
  }
}
module.exports = Folders;
