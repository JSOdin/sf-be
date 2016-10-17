var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var GameSchema = new Schema({
    appid:{
        type: String
    },
    name: {
        type: String
    },
    playtime_2weeks: {
        type: Number
    },
    playtime_foreveer :{
        type:Number
    },
    img_icon_url:{
        type:String
    },
    img_logo_url: {
        type:String
    }
});

var notificationSchema = new Schema({
    time :{
        type:Date
    },
    noticetype:{
        type: String
    },
    user :{
        type: Object
    },
    read :{
        type:Boolean,
        default: false
    }
});

var messageSchema  = new Schema({
    from:{
        type: String
    },
    fromsteamid:{
       type:String
    },
    frompageid:{
      type:Number
    },
    body: {
        type: String
    },
    submitted :{
        type: Date
    }
});

var conversationSchema = new Schema({
    with:{
      type: String
    },
    withsteamid:{
      type: String
    },
    withpageid :{
        type:Number
    },
    subject:{
      type: String
    },
    messages:{
        type: [messageSchema],
        default:[]
    }
    ,
    read: {
        type: Boolean,
        default:false
    },
    connectID:{
        type: String
    }
});

var commentSchema = new Schema({
    avatarmedium:{
        type:String
    },
    authorid:{
        type:String
    },
    authorpageid:{
       type:String
    },
    author:{
        type:String
    },
    submitted:{
        type:Date
    },
    profileurl:{
        type: String
    },
    comment:{
        type:String
    },
    sentto:{
        type:String
    },
    settings:{
        type:Object
    },
    blocked:{
        type: Array,
        default:[]
    }
});

var FriendSchema = new Schema({
    _id:{
      type:String
    },
    userPageID:{
        type: Number
    },
    steamid :{
        type:String/*,
        index:{
            unique:true,
            sparse:true                 // why use "sparse" ? http://stackoverflow.com/questions/24430220/e11000-duplicate-key-error-index-in-mongodb-mongoose
        }*/
    },
    profileurl:{
        type: String
    },
    personaname: {
        type:String
    },
    avatar:{
        type:String
    },
    avatarmedium:{
        type:String
    },
    avatarfull:{
        type:String
    },

    personal:{
        language:[String],
        age:{
            type:Number
        },
        gender:{
            type:String
        },
        country: {
            type:String
        },
        voip:[String]
    },
    recentlyPlayed:[GameSchema]
});

var GroupSchema = new Schema({
   name :{
       type:String
   },
   list:{
       type:[FriendSchema]
   }
});



var UserSchema = new Schema({
 /*   createdOn:{
       type: Date,
        required: true,
        default: Date.now,
        index: true
    },*/
    userPageID:{
        type: Number,
        index:{
            unique:true
        }
    },
    steamid: {
        type: String/*,
        required:true,
        index:{
            unique:true,
            sparse:true           // why use "sparse" ? http://stackoverflow.com/questions/24430220/e11000-duplicate-key-error-index-in-mongodb-mongoose
        }*/
    },
    comments:{
        type:[commentSchema],
        default:[]
    },
    profileurl:{
        type: String
    },
    addfriendurl:{
        type: String
    },
    personaname: {
        type: String
    },
    avatar:{
        type:String
    },
    avatarmedium:{
        type:String
    },
    avatarfull:{
        type:String
    },
    blocked : {
        type: Array,
        default: []
    },
    recentlyPlayed:[GameSchema],
    ownedGames:[GameSchema],
    csgo:{
        /*dedication:{
            type:String
        },*/
        mode:{
            type:String,
            default:''
        },
        rank:{
            type:String,
            default:''
        },
        role: {
            type:String,
            default:''
        },
        team:{
           type: String,
            default:''
        },
        howlong:{
            type:String,
            default:''
        }
    },
    dota: {
       /* dedication:{
            type:String
        },*/
        mode:{
           type:String,
            default:''
        },
        rank:{
            partymmr:{
                type:String,
                default:''
            },
            solommr:{
                type:String,
                default:''
            }
        },
        position:{
            type:String,
            default:''
        },
        serverregion:{
            type:String,
            default:''
        }
    },
    general:{
        preferredgenre: {
            type: String
        },
        time:{
            type: String
        },
        intent:{
            type: String
        },
        region:{
            type: String
        },
        introduction:{
            type: String
        }
    },
    personal:{
        language:{
            type:String
        },
        birthdate:{
          type:Date
        },
        gender:{
            type:String
        },
        country: {
            type:String
        },
        communication: {
            type:String
        }
    },
    social:{
        friends:{
            list: [FriendSchema],
            groups: {
                list:[GroupSchema]
            },
            pending: {
                sent:{
                    type:[FriendSchema],
                    default: []
                },
                received:{
                    type:[FriendSchema],
                    default:[]
                }
            }
        }
    },
    settings: {
        haspost:{
          type:Boolean,
            default:false
        },
        admin:{
            appcheck:{
                csgo:{
                    type:Boolean,
                    default: false
                },
                dota:{
                    type:Boolean,
                    default: false
                }
            },
            submittedgameprofile:{
                type:Boolean,
                default:false
            },
            generalpersonal:{
               type:Boolean,
                default: false
            },
            existsindb:{
                type:Boolean,
                default: false
            }
        },
        user:{
            addSteamSetting: {
                type:Boolean,
                default: false
            },
            msgOnSiteSetting:{
                type:Boolean,
                default: false
            },
            profilePrivacy:{
                type:Boolean,
                default: false
            },
            noDisplayStats:{
                type:Boolean,
                default:false
            },
            noDisplayLinks: {
                type:Boolean,
                default:false
            }
        }
    },
    conversations: {
        type: [conversationSchema],
        default:[]
    },
    notifications :{
        type:[notificationSchema],
        default:[]
    }
});

module.exports = mongoose.model('User',UserSchema)