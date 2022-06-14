
//express 페키지 파일을 불러와서 저장
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { Op } = require("sequelize");
const { User, Post, Like } = require("./models");
const app = express();
const router = express.Router();
const fs = require('fs')
app.use(express.json());
app.use("/api", express.urlencoded({ extended: false }), router);
app.use(cors());

const jwt = require("jsonwebtoken");
const authMiddleware = require("./middlewares/auth-middleware")


const upload = multer({
  storage: multer.diskStorage({

    destination: (req, file, cb) => {
      cb(null, 'uploads/')
    },
    filename: (req,file,cb) => {
      cb(null,new Date().valueOf() + path.extname(file.originalname));
    },
  }),
  
});







//게시글 목록 가져오기
router.get("/post", async (req, res) => {
  const post_list = await Post.findAll()
  res.send({
    post_list
  });
});

// 게시글 추가  
router.post("/post",authMiddleware,upload.single('image'),async (req, res) => {
  console.log(req.file)
  console.log('!!!!!!!!!!!!!!!!!!!!!!!')
  if (req.file){
    image = req.file.filename
  } else {
    image = ""
  }
  console.log(image)
  const { user } = res.locals;
  const userId = user.userId
  const { title, content, layout } = req.body;
  const nickname = user.nickname;
  console.log(user)
  
  await Post.create({ userId, title, content, layout, nickname, image });

  res.status(201).send({success: true});

});

// 게시글 조회 authMiddleware
router.get("/post/:postId",authMiddleware,async (req,res) => {
  
  const { user } = res.locals;
  
  const { postId } = req.params;
  const post = await Post.findByPk(postId)
  
  if (post.length < 1) {
    res.status(400).semd({ errorMessage: '원하시는 게시물 정보가 없습니다.'})
    return
  }

  const like = await Like.findAll({
    where: {
      userId:user.userId,
      postId
    }
  });



  if (like.length < 1) {
    const likeByMe = false
  } else {
    const likeByMe = true
  }
  
  const likecount = await Like.findAll({
    where: { postId },
  });

  const likeCount = likecount.length;


  res.send({ 
    postId,
    title: post.title,
    content: post.content,
    userId: post.userId,
    image: post.image,
    likeByMe,
    likeCount,
   });

});

// 게시글 삭제 authMiddleware
router.delete("/post/:postId",authMiddleware,async (req, res) => {
  const { user } = res.locals;
  const { postId } = req.params;
  const post = await Post.findByPk(postId)
  console.log(user)
  if (post.userId !== user.userId && !user.admin) {
    res.status(400).send({errorMessage:'삭제할수 있는 권한이 없습니다.'})
    return;
  }

  await post.destroy();
  
  res.send({success: true, message:'게시글이 성공적으로 삭제되었습니다.'});
   

})


//게시글 수정 , authMiddleware
router.post("/post/:postId",authMiddleware,async (req, res) => {
  const { user } = res.locals;
  const { postId } = req.params;
  const post = await Post.findByPk(postId)
  console.log(post,user,post.userId,user.userId)
    if (post.userId !== user.userId && !user.admin) {
      res.status(400).send({errorMessage:'수정할수 있는 권한이 없습니다.'})
      return;
    }
const {title, content, layout, image} = req.body;

if (title){
  post.update({
    title
  },{
    where: postId
  });
} else if (content){
  post.update({
    content
  },{
    where: postId
  });

} else if (layout){
  post.update({
    layout
  },{
    where: postId
  });
} else if (image){
  post.update({
    image
  },{
    where: postId
  });
}

res.send({success: true, message: "게시글이 성공적으로 수정되었습니다."});
  

})


//게시글 좋아요 or 좋아요 취소  , authMiddleware
router.post("/post/:postId/like",authMiddleware ,async (req, res) => {
  const { user } = res.locals;
  const { postId } = req.params;
  const userId = user.userId

  const like = await Like.findOne({ where: { userId, postId }});  

  if (like.length < 1){
    //게시글 좋아요를 해준다
    await Like.create({postId, userId});
    res.send({success:true,message:'좋아요를 눌렀습니다.'})
    return;
  } else {
    //게시글 좋아요를 취소해준다.
    await like.destroy();
    res.send({success:true,message:'좋아요를 취소했습니다.'})
    return;

  }
})


//회원가입

router.post("/register", async (req, res) => {
  const { nickname, email, password, passwordCheck } = req.body;
  const admin = false;
  if (password !== passwordCheck) {
    res.status(400).send({
      errorMessage: '패스워드가 패스워드 확인란과 동일하지 않습니다.'
    })
    return;
  }
  console.log(req.body)
  console.log(nickname, email, password, passwordCheck)
//닉네임은 최소 3자 이상, 알파벳 대소문자(a~z, A~Z), 숫자(0~9)로 구성하기
  function isnickname(nickname) {
    let regExp = /^[A-Za-z0-9]{3,}$/g;

    return regExp.test(nickname);

  }
//비밀번호는 최소 4자 이상이며, 닉네임과 같은 값이 포함된 경우 회원가입에 실패로 만들기
  function ispassword(password,nickname) {
    if (password.includes(nickname)) {
      return false
    }
    if (password.length < 4) {
      return false
    }
    return true

  }

  if (!isnickname(nickname) || !ispassword(password,nickname)){
    res.status(400).send({
      errorMessage:'닉네임 또는 패스워드를 확인해 주세요.'
    })

    return ;
  }

  const existUsers = await User.findAll({
    where: {
      [Op.or]: [{ nickname }, { email }],
    },
  });
  if (existUsers.length) {
    res.status(400).send({
      errorMessage:'이미 가입된 이메일 또는 닉네임이 있습니다.'
    })
    return;
  }

  await User.create({ email, nickname, password, admin });

  res.status(201).send({});


});

//로그인 
router.post("/login",async (req,res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email, password }});
  if (!user) {
    res.status(401).send({
      errorMessage: '이메일 또는 패스워드가 잘못됐습니다'
    });
    return;
  }

  const token = jwt.sign({ userId: user.userId}, "my-secret-key");
  res.send({
    token,user
  })
});

// router.get("/users/me", authMiddleware, async(req,res) => {
//   const { user } = res.locals;
//   console.log(user)
//   // 프론트에서 요청한대로 객체를 넘겨주어야 한다.
//   res.send({
//     user: {
//       email: user.email,
//       nickname: user.nickname
//     }
//   });

// });



// app.use(express.static("assets"));

app.listen(3000, () => {
    console.log("서버가 켜졌습니다.");
});