const welcomeTemplate = (firstName) => {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Anek+Gurmukhi:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
          body{
              font-family: 'Anek Gurmukhi', sans-serif;
              margin: 0;
              padding: 0;
              box-sizing: border-box;
          }
          .welcome{
              margin: 0 auto;
              width: 576px;
              font-weight: 400;
              text-align: start;
             
 
          }
          .welcome h1{
              font-weight: 500;
              font-size: 24px;
              margin-top: 15px;
              margin-bottom: 44px;
              line-height: 32px;
              width: 512px;
 
          }
          .welcome p{
              line-height: 24px;
              /* font-weight: 400; */
              font-size: 20px;
              margin-bottom: 20px;
            color: #333;
          }
          .welcome small{
              font-size: 14px;
              color: #999;
              line-height: 20px;
              margin-bottom: 18px;
          }
         
          .footer{
              width: 100%;
              height: 239px;
              background-image: url('https://res.cloudinary.com/dhekqilcw/image/upload/v1687596415/mgjj1n02ixqc9frk8h2x.png');
              background-size: cover;
          }
          .footer-socials{
              width: 100px;
              padding-top: 64.69px;
              margin:0 auto;
              margin-bottom: 19.74px;
              gap: 28px;
              text-align: center;
          }
          .logo{
             margin: 0 auto;
             display: block;
             margin-bottom: 10px; 
          }
          .footer p{
              font-weight: 400;
              line-height: 16px;
              font-size: 12px;
              text-align: center;
          }
          @media screen and (max-width: 640px) {
            .welcome{
              width: 90%;
            }
            .welcome h1{
              font-size: 18px;
              width: 100%
            }
            .welcome p{
              font-size: 18px;
            }
            .welcome small{
              font-size: 12px;
           }  
          }
         
      </style>
  </head>
  <body>
      <div>
          <div class='welcome'>
            <h1><span style="font-weight: 700;"></span>Welcome to TechyJaunt! Start your journey into becoming a Tech Expert</h1>
            <p>Hi ${firstName}, </p>
            <p>I want to personally welcome you to TechyJaunt, designed to help you achieve tech excellence. Our platform is designed to help you master technology skills in a smart and structured way by offering comprehensive courses, live classes, expert tutoring, and hands-on projects. We believe that tech mastery is achievable for everyone, and our platform is here to help you on that journey.</p>
            <p>At TechyJaunt, we believe in practical learning and continuous growth. Our platform offers personalized learning paths and insights based on your progress, helping you to make informed decisions about your tech career. We also offer live sessions, expert mentorship, and real-world projects to help you excel even more.</p>
            <p>Our team has worked tirelessly to create a platform that is not only easy to use but also secure. We use advanced encryption and other security measures to protect your learning data and comply with all applicable data privacy and security regulations.</p>
            <p>Thank you for choosing TechyJaunt as your learning partner. We're excited to help you achieve your tech goals and look forward to serving you.</p>
            <p>Best regards,</p>
            <p>John Kent</p>
            <p>Founder, TechyJaunt</p>
            <small>For questions, you can reach out to us at <span style='color:#2230F6'>support@techyjaunt.com</span></small>
          </div>
          <div class='footer'>
              <div class='footer-socials'>
            <img src="https://res.cloudinary.com/dhekqilcw/image/upload/v1688986596/twitterlogo_w6imak.png" alt="twitter">
            <img src="https://res.cloudinary.com/dhekqilcw/image/upload/v1688986679/facebooklogo_iyntcg.png" alt="facebook">
            <img src="https://res.cloudinary.com/dhekqilcw/image/upload/v1688986662/linkedin_yzexwx.png" alt="linkedin">
            </div>
             <img src='https://res.cloudinary.com/dhekqilcw/image/upload/v1688986634/saveylogo_fekkxc.png' alt="TechyJaunt logo" class='logo'/>
              <p>Copyright &copy; 2023</p>
              <p>TechyJaunt - Empowering Learning Through Technology.</p>
              <p>Your journey into tech excellence and professional growth starts here.</p>
             
          </div>
      </div>
  </body>
  </html>
  `;
};

export default welcomeTemplate;
