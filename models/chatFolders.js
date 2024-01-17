class ChatFolders {
    constructor(creator, type,ids) {
      this.creator = creator;
      this.ids = ids
      this.type = type;
      this.createdAt=new Date().getTime()
    }
  }
  module.exports = ChatFolders;
  