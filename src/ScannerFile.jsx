import React, { useState } from 'react';
import ReactJson from 'react-json-view';
import Card from '@material-ui/core/Card';
import { makeStyles } from '@material-ui/core/styles';
import CardActions from '@material-ui/core/CardActions';
import CardHeader from '@material-ui/core/CardHeader';
import Box from '@material-ui/core/Box';
import CardContent from '@material-ui/core/CardContent';
import Container from '@material-ui/core/Container';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import ReportIcon from '@material-ui/icons/Report';
import Loader from "react-loader-spinner";
import Paper from '@material-ui/core/Paper';
import Collapse from '@material-ui/core/Collapse';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import IconButton from '@material-ui/core/IconButton';
import clsx from 'clsx';
import { BrowserQRCodeReader } from '@zxing/browser';

const axios = require("axios").default;
const jose = require('node-jose');
const pako = require('pako');

const useStyles = makeStyles({
  root: {
    marginTop:'20px',
    marginBottom:'40px',
    wordWrap: 'break-word'
  },
  bullet: {
    display: 'inline-block',
    margin: '0 2px',
    transform: 'scale(0.8)',
  },
  title: {
    fontSize: 14,
  },
  pos: {
    marginBottom: 12,
  },
});

const ScannerFile = () => {
  const [result, setResult] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [signatureJWS, setSignatureJWS] = useState('');
  const [decodedHeader, setDecodedHeader] = useState('{}');
  const [decodedPayload, setDecodedPayload] = useState('{}');
  const [issuer, setIssuer] = useState('');
  const [verified, setVerification] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [expanded2, setExpanded2] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cvxCode, setCVXCode] = useState('');
  const [vaccDate1, setVaccDate1] = useState('');
  const [vaccDate2, setVaccDate2] = useState('');
  const [inVCI, setInVCI] = useState(false);
  const [message, setMessage] = useState('Awaiting File Upload');

  const getIssuerCred = async (data) => {
    try {
      let jwks;
      const issuerHere = JSON.parse(pako.inflateRaw(Buffer.from(data.split(".")[1], "base64"), { to: 'string'})).iss;
      let issEndpoint = issuerHere + '/.well-known/jwks.json';
      const response = await axios.get(issEndpoint);
      jwks = response.data;
      const keystore = await jose.JWK.asKeyStore(jwks);
      const result = await jose.JWS.createVerify(keystore).verify(data);
      if(result.key.kid === jwks.keys[0].kid) {
        setVerification(true)
      } else {
        setError('Signature is not valid from the listed issuer.')
      }
      let issDir = await axios.get("https://raw.githubusercontent.com/the-commons-project/vci-directory/main/vci-issuers.json");
      if(issDir.data.participating_issuers.some(e => e.iss === issuerHere )) {
        setInVCI(true);
      }
      setResult(true)
    } catch (err) {
      setError("Please hold the QR code up for a bit longer!")
    }
  }

  const handleScan = (data, type) => {
    if (data) {
      setScanned(true);
      let splitData;
      if(type === "img") {
        splitData = data.split("/")[1].match(/(..?)/g).map((number) => String.fromCharCode(parseInt(number, 10) + 45)).join("");
      } else {
        splitData = data;
      }
      setIssuer(JSON.parse(pako.inflateRaw(Buffer.from(splitData.split(".")[1], "base64"), { to: 'string'})).iss)
      setSignatureJWS(splitData.split(".")[2]);
      setDecodedHeader(JSON.stringify(JSON.parse(Buffer.from(splitData.split(".")[0], "base64"))));
      setDecodedPayload(JSON.stringify(JSON.parse(pako.inflateRaw(Buffer.from(splitData.split(".")[1], "base64"), { to: 'string'}))));
      setFirstName(JSON.parse(pako.inflateRaw(Buffer.from(splitData.split(".")[1], "base64"), { to: 'string'})).vc.credentialSubject.fhirBundle.entry[0].resource.name[0].given[0]);
      setLastName(JSON.parse(pako.inflateRaw(Buffer.from(splitData.split(".")[1], "base64"), { to: 'string'})).vc.credentialSubject.fhirBundle.entry[0].resource.name[0].family);
      setMiddleInitial(JSON.parse(pako.inflateRaw(Buffer.from(splitData.split(".")[1], "base64"), { to: 'string'})).vc.credentialSubject.fhirBundle.entry[0].resource.name[0].given[1]);
      setBirthDate(JSON.parse(pako.inflateRaw(Buffer.from(splitData.split(".")[1], "base64"), { to: 'string'})).vc.credentialSubject.fhirBundle.entry[0].resource.birthDate);
      if(JSON.parse(pako.inflateRaw(Buffer.from(splitData.split(".")[1], "base64"), { to: 'string'})).vc.credentialSubject.fhirBundle.entry[1].resource.vaccineCode.coding[0].code === '207'){
        setCVXCode("MODERNA");
        setVaccDate1(JSON.parse(pako.inflateRaw(Buffer.from(splitData.split(".")[1], "base64"), { to: 'string'})).vc.credentialSubject.fhirBundle.entry[1].resource.occurrenceDateTime);
        try{
          setVaccDate2(JSON.parse(pako.inflateRaw(Buffer.from(splitData.split(".")[1], "base64"), { to: 'string'})).vc.credentialSubject.fhirBundle.entry[2].resource.occurrenceDateTime);
        } catch (error) {
          setVaccDate2('')
        }
      } else if(JSON.parse(pako.inflateRaw(Buffer.from(splitData.split(".")[1], "base64"), { to: 'string'})).vc.credentialSubject.fhirBundle.entry[1].resource.vaccineCode.coding[0].code === '208') {
        setCVXCode("PFIZER");
        setVaccDate1(JSON.parse(pako.inflateRaw(Buffer.from(splitData.split(".")[1], "base64"), { to: 'string'})).vc.credentialSubject.fhirBundle.entry[1].resource.occurrenceDateTime);
        try{
          setVaccDate2(JSON.parse(pako.inflateRaw(Buffer.from(splitData.split(".")[1], "base64"), { to: 'string'})).vc.credentialSubject.fhirBundle.entry[2].resource.occurrenceDateTime);
        }catch(error) {
          setVaccDate2('');
        }
      } else {
        setCVXCode("JOHNSON & JOHNSON");
        setVaccDate1(JSON.parse(pako.inflateRaw(Buffer.from(splitData.split(".")[1], "base64"), { to: 'string'})).vc.credentialSubject.fhirBundle.entry[1].resource.occurrenceDateTime);
      }
      let issuerCred = getIssuerCred(splitData)
    }
  }

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };
  const handleExpandClick2 = () => {
    setExpanded2(!expanded2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let fileName = e.target.files[0].name;
    if(fileName.slice(fileName.length - 4) === '.jpg' || fileName.slice(fileName.length - 4) === '.png') {
      let uplIMG = URL.createObjectURL(e.target.files[0]);
      const codeReader = new BrowserQRCodeReader();
      try{
        const resultImage = await codeReader.decodeFromImageUrl(uplIMG);
        handleScan(resultImage.text, "img");
      } catch (error) {
        setMessage("Unable to read QR in file. Please try a different one!")
      }
    } else if (fileName.slice(fileName.length - 18) === '.smart-health-card') {
      const reader = new FileReader()
      let text;
      reader.readAsText(e.target.files[0]);
      reader.onload = async (e) => {
        text = (JSON.parse(e.target.result).verifiableCredential[0])
        // setSHCFile(e.target.result)
        handleScan(text, "shc");
      };
    } else {
      setMessage("File type not supported. Only .jpg, .png, and .smart-health-card files are supported!");
    }
  }

  const classes = useStyles();
  return (
    <div className={classes.root}>
      <Box display="flex" justifyContent="center">
        <Paper elevation={3} />
        <Container maxWidth="sm" >
          <Card className={classes.root} >
            <CardHeader style={{ textAlign: "center"}}
              title="Smart Health Card File Reader"
              subheader="All data is handled client side! Nothing is ever sent to the server!"
            />
          <CardHeader style={{ textAlign: "center"}}
              subheader="This tool has not been officially reviewed by a security team so use it at your own risk!"
            />
          <CardHeader style={{ textAlign: "center"}}
              subheader="Upload your QR code in a .jpg or .png format or your .smart-health-card file!"
            />
          <CardContent style={{display: "flex", justifyContent: "center"}} >
            <div>
              <input id="f" type="file" onChange={(e) => handleSubmit(e)}/>
            </div>
            </CardContent>
            <CardContent>
              {!scanned ?
                <div style={{ textAlign: "center"}}>
                  <h3>{message}</h3>
                </div>
                : [
                  !verified  ?
                    <Loader
                      type="TailSpin"
                      color="#a794d1"
                      height={50}
                      width={50}
                    />
                  : [
                    result ?
                    [
                      inVCI ?
                        <div>
                          <p style={{color: "green"}}><CheckCircleOutlineIcon style={{fill: "green"}}/> Payload Verified!</p>
                          <p style={{color: "green"}}><CheckCircleOutlineIcon style={{fill: "green"}}/> Signature Verified!</p>
                          <p style={{color: "green"}}><CheckCircleOutlineIcon style={{fill: "green"}}/> Issuer Verified in VCI Directory!</p>
                        </div>
                        :
                        <div>
                          <p style={{color: "green"}}><CheckCircleOutlineIcon style={{fill: "green"}}/> Payload Verified!</p>
                          <p style={{color: "green"}}><CheckCircleOutlineIcon style={{fill: "green"}}/> Signature Verified!</p>
                          <p style={{color: "red"}}><ReportIcon style={{fill: "red"}}/> Issuer Not Verified in VCI Directory!</p>
                        </div>
                    ]
                    :
                      <div>
                        <p style={{color: "green"}}><CheckCircleOutlineIcon style={{fill: "green"}}/> Payload Verified!</p>
                        <p style={{color: "red"}}><ReportIcon style={{fill: "red"}}/> Signature NOT Verified!</p>
                        <p style={{color: "red"}}><ReportIcon style={{fill: "red"}}/> Issuer Not Verified in VCI Directory!</p>
                      </div>
                  ]
                ]
              }
            </CardContent>
            <CardActions disableSpacing>
              <IconButton
                className={clsx(classes.expand, {
                  [classes.expandOpen]: expanded2,
                })}
                onClick={handleExpandClick2}
                aria-expanded={expanded2}
                aria-label="show more"
              >
                <ExpandMoreIcon />
                <p>Parsed Information</p>
              </IconButton>
            </CardActions>
            <Collapse in={expanded2} timeout="auto" unmountOnExit>
              <CardContent>
                <Typography paragraph variant="h6">Name:</Typography>
                <Typography paragraph>{firstName} {middleInitial} {lastName}</Typography>
                <Typography paragraph variant="h6">Birth Date</Typography>
                <Typography paragraph>{birthDate}</Typography>
                <Typography paragraph variant="h6">Vaccine Received:</Typography>
                <Typography paragraph>{cvxCode}</Typography>
                <Typography paragraph variant="h6">Vaccine Date One:</Typography>
                <Typography paragraph>{vaccDate1}</Typography>
                <Typography paragraph variant="h6">Vaccine Date Two:</Typography>
                <Typography paragraph>{vaccDate2}</Typography>
              </CardContent>
            </Collapse>
            <CardActions disableSpacing>
              <IconButton
                className={clsx(classes.expand, {
                  [classes.expandOpen]: expanded,
                })}
                onClick={handleExpandClick}
                aria-expanded={expanded}
                aria-label="show more"
              >
                <ExpandMoreIcon />
                <p>Full JWS</p>
              </IconButton>
            </CardActions>
            <CardContent>
              <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Typography paragraph variant="h6">Header:</Typography>
                <ReactJson style={{wordBreak: "break-all"}} collapsed="true" indentWidth="2" src={JSON.parse(decodedHeader)} />
                <Typography paragraph variant="h6" style={{marginTop: 20}}>Payload:</Typography>
                <ReactJson style={{wordBreak: "break-all"}} indentWidth="2" src={JSON.parse(decodedPayload)} />
                <Typography paragraph variant="h6" style={{marginTop: 20}}>Signature:</Typography>
                <Typography paragraph variant="body">{signatureJWS}</Typography>
              </Collapse>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </div>
  )
}

export default ScannerFile;
