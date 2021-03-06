import { Component } from '@angular/core';
import { Camera, CameraOptions } from '@ionic-native/camera';
import { NavController, NavParams, LoadingController, ModalController } from 'ionic-angular';
import { Auth, User, UserDetails, IDetailedError,FacebookAuth } from '@ionic/cloud-angular';
import { InAppBrowser } from '@ionic-native/in-app-browser';
import { GooglePlus } from '@ionic-native/google-plus';
import { SpiinpiinService } from '../../providers/spiinpiin-service';
import { SignupPasswordModalPage } from '../signup-password-modal/signup-password-modal';
import { CountriesObject } from "../../app/object-countries";
import { MenuPage } from '../menu/menu';
@Component({
  selector: 'page-signup',
  templateUrl: 'signup.html'
})

export class SignupPage {

  constructor(public facebookAuth: FacebookAuth,private googlePlus: GooglePlus,public f_auth: Auth, public user: User, private camera: Camera, public navCtrl: NavController, public modalCtrl: ModalController, public navParams: NavParams, private spiinpiinservice: SpiinpiinService) {
  }
  passwordType: string = "password";
  countries: CountriesObject[] = [];
  loader: any;
  profile = null;
  auth = {
    fname: null,
    lname: null,
    email: null,
    country: null,
    phone: null,
    passworda: null,
    passwordb: null,
    accept_tc: false,
    showpwd: false,
    photo: "assets/user.png"
  }

  ionViewDidLoad() {
    this.loader = this.spiinpiinservice.showLoader("Please wait ...");
    this.loader.present();
    this.spiinpiinservice.getCountries().subscribe((response) => {
      if (response.status == 1) {
        this.countries = response.data;
      } else {
        this.spiinpiinservice.toastMessage(response.msg);
      }
      this.loader.dismiss();
    }, (error) => {
      this.loader.dismiss();
      this.spiinpiinservice.toastMessage("Could not get countries");
    })
  }

  doSocialSignup(method) {
    if (!this.auth.fname) {
      this.spiinpiinservice.toastMessage("Enter your First name");
      return;
    }
    if (!this.auth.lname) {
      this.spiinpiinservice.toastMessage("Enter your surname");
      return;
    }


    if (!this.auth.email) {
      this.spiinpiinservice.toastMessage("Enter your email Address");
      return;
    }

    if (!this.spiinpiinservice.validateEmail(this.auth.email)) {
      this.spiinpiinservice.toastMessage("The email address is invalid");
      return;
    }
    if (!this.auth.country) {
      this.spiinpiinservice.toastMessage("Choose your country");
      return;
    }

    if (!this.auth.phone) {
      this.spiinpiinservice.toastMessage("Enter your phone number");
      return;
    }

    if (!this.auth.accept_tc) {
      this.spiinpiinservice.toastMessage("Accept Terms and Conditions to proceed");
      return;
    }

    switch (method) {
      case "twitter":
        this.f_auth.login('twitter').then(() => {
          this.spiinpiinservice.saveToLocalStorage('authObject', this.user.social.twitter);
          this.sendToSpiinpiinServer(method, this.user.social.twitter.uid);
        });
        break;
      case "facebook":
        this.facebookAuth.login().then(()=>{
          let fb = {
            uid:this.user.social.facebook.uid,
            email:this.user.social.facebook.data.email,
            full_name:this.user.social.facebook.data.full_name
          }
          this.spiinpiinservice.saveToLocalStorage('authObject', fb);
          this.sendToSpiinpiinServer(method, this.user.social.facebook.uid);

        });
        break;
      case "google":
         this.googlePlus.login({'webClientId': '302166569553-4n0j1ulrpikg8828ahmk9q6k6c97tvk7.apps.googleusercontent.com'}).then((res) => {
          this.sendToSpiinpiinServer(method,res.userId);    
        }, (err) => {
          this.spiinpiinservice.toastMessage(JSON.stringify(err));
        });
        console.log(method);
        break;
      case "password":
         this.showPasswordModal();
         break;
     
    }

  }

  sendToSpiinpiinServer(provider, fuid) {
    this.loader = this.spiinpiinservice.showLoader("Please wait ...");
    this.loader.present();
    let data = {
      'name': this.auth.fname + " " + this.auth.lname,
      'fedemail': this.auth.email,
      'email': this.auth.email,
      'country': this.auth.country,
      'phone': this.auth.phone,
      'provider': provider,
      'fedid': fuid,
      '_id': fuid,
      'primaryfedid': fuid,
      'photo': this.auth.photo,
      'gender': "NA",
      'verified': false,
      'dob': new Date()
    };

    this.spiinpiinservice.callPostApi("USER_API_ENDPOINT","/users/api/register", data).subscribe((response) => {
      this.loader.dismiss();
      if (response.status == 1) {
        this.spiinpiinservice.saveToLocalStorage("sessionkey", response.data.key);
        this.spiinpiinservice.saveToLocalStorage("name", response.data.name);
        this.spiinpiinservice.saveToLocalStorage("profilepic", this.auth.photo);
        this.navCtrl.setRoot(MenuPage);
      } else {
        this.spiinpiinservice.toastMessage(response.msg);
      }
    }, (error) => {
      this.loader.dismiss();
      this.spiinpiinservice.toastMessage(error.statusText);
    });
  }

  uploadPicture() {
    let camOptions: CameraOptions = {
      quality: 100,
      destinationType:this.camera.DestinationType.DATA_URL,
      sourceType:this.camera.PictureSourceType.PHOTOLIBRARY,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE
    }
    this.camera.getPicture(camOptions).then((imageData) => {
      this.auth.photo = 'data:image/jpeg;base64,' + imageData;
    }, (err) => {
      this.spiinpiinservice.toastMessage(err);
    });

  }



  toggleShowPassword() {
    switch (this.auth.showpwd) {
      case true:
        this.passwordType = "text";
        break;
      case false:
        this.passwordType = "password";
        break;
      default:
        this.passwordType = "password";
        break;
    }
  }


  showPasswordModal() {
    if (!this.auth.email) {
      this.spiinpiinservice.toastMessage("Enter your email Address");
      return;
    }

    if (!this.spiinpiinservice.validateEmail(this.auth.email)) {
      this.spiinpiinservice.toastMessage("The email address is invalid");
      return;
    }
    let profileModal = this.modalCtrl.create(SignupPasswordModalPage, { "email": this.auth.email });
    profileModal.onDidDismiss(data => {
      if (data) {
        this.loader = this.spiinpiinservice.showLoader("Please wait ...");
        this.loader.present()
        let details: UserDetails = { 'email': this.auth.email, 'password': data, 'name': this.auth.fname + " " + this.auth.lname };
        this.f_auth.signup(details).then((data) => {          
          this.f_auth.login('basic', {'email': this.auth.email, 'password': data}).then((res)=>{
             this.spiinpiinservice.saveToLocalStorage('authObject', this.user.details);
          });         
          this.loader.dismiss();
          this.sendToSpiinpiinServer("password", (this.auth.email).trim());
        },
          (err) => {
            this.spiinpiinservice.toastMessage(JSON.stringify(err));
            this.loader.dismiss();
          }
         
        );
      }
    });
    profileModal.present();
  }

  goToSignIn() {
    this.navCtrl.pop();
  }



}
