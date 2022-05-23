import React from 'react';
import { Video } from './Video';
import { Controls } from './Controls';
import { mediaRecorder } from '../../utils/mediaRecorder';
import { RecordWebcamOptions, Recorder } from '../../utils/types';
import { saveFile } from '../../utils/utils';
import { CAMERA_STATUS, NAMESPACES, RECORDER_OPTIONS } from '../../constants';

import * as faceApi from "face-api.js";


type RenderControlsArgs = {
  openCamera: () => void;
  closeCamera: () => void;
  start: () => void;
  stop: () => void;
  retake: () => void;
  download: () => void;
  getRecording: () => void;
  status: string;
};

type RecordWebcamProps = {
  cssNamespace?: string;
  downloadFileName?: string;
  options?: RecordWebcamOptions;
  getStatus?(status: string): void;
  render?({}: RenderControlsArgs): void;
  controlLabels?: {
    CLOSE: string | number;
    DOWNLOAD: string | number;
    OPEN: string | number;
    RETAKE: string | number;
    START: string | number;
    STOP: string | number;
  };
  captureVideo?: boolean;
  captureAudio?: boolean;
  small?: number;
  setMuteAudio?: any;
};

type RecordWebcamState = {
  status: keyof typeof CAMERA_STATUS;
  facesDetected: boolean;
  large: boolean;
};

export class RecordWebcam extends React.PureComponent<
  RecordWebcamProps,
  RecordWebcamState
> {
  constructor(props: RecordWebcamProps) {
    super(props);
    this.closeCamera = this.closeCamera.bind(this);
    this.download = this.download.bind(this);
    this.getRecording = this.getRecording.bind(this);
    this.handleOpenCamera = this.handleOpenCamera.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleCloseCamera = this.handleCloseCamera.bind(this);
    this.handleRetakeRecording = this.handleRetakeRecording.bind(this);
    this.handleStartRecording = this.handleStartRecording.bind(this);
    this.handleStopRecording = this.handleStopRecording.bind(this);
    this.openCamera = this.openCamera.bind(this);
    console.log(this.props.options?.small);
  }
  state = {
    status: CAMERA_STATUS.CLOSED,
    facesDetected: false,
    large: false,
  };
  recorder!: Recorder;
  recorderOptions = {
    ...RECORDER_OPTIONS,
    ...{
      mimeType: `video/${this.props.options?.fileType || 'mp4'};codecs=${
        this.props.options?.codec?.video ||
        this.props.options?.fileType === 'webm'
          ? 'vp8'
          : 'avc'
      },${
        this.props.options?.codec?.audio ||
        this.props.options?.fileType === 'webm'
          ? 'opus'
          : 'aac'
      }`,
      width: this.props.options?.width || RECORDER_OPTIONS.width,
      height: this.props.options?.height || RECORDER_OPTIONS.height,
      aspectRatio:
        this.props.options?.aspectRatio || RECORDER_OPTIONS.aspectRatio,
      isNewSize: Boolean(
        this.props.options?.width || this.props.options?.height
      ),
      captureVideo: this.props.options?.captureVideo,
      captureAudio: this.props.options?.captureAudio,
      small: this.props.options?.small,
      setMuteAudio: this.props.options?.setMuteAudio,
    },
  };
  webcamRef = React.createRef<HTMLVideoElement>();
  previewRef = React.createRef<HTMLVideoElement>();

  static defaultProps = {
    cssNamespace: NAMESPACES.CSS,
  };

  componentWillReceiveProps(nextProps: RecordWebcamProps) {
    // this.handleCloseCamera();
    if (nextProps.options?.captureVideo) {
      this.setState({
        status: CAMERA_STATUS.OPEN
      });
      this.recorderOptions.captureVideo = true;
      this.recorderOptions.captureAudio = nextProps.captureAudio;
      this.openCamera();
    } else {
      this.setState({
        status: CAMERA_STATUS.CLOSED
      });
      this.recorderOptions.captureVideo = false;
      this.recorderOptions.captureAudio = nextProps.captureAudio;
      this.openCamera();
    }
  }

  async openCamera(): Promise<void> {
    const recorderInit = await mediaRecorder(this.recorderOptions);
    this.recorder = recorderInit;
    if (this.webcamRef.current) {
      this.webcamRef.current.srcObject = recorderInit.stream;
    }
    await new Promise((resolve) => setTimeout(resolve, 1700));
  }

  closeCamera() {
    if (this.recorder.stream.id) this.recorder.stream.stop();
  }

  handleCloseCamera() {
    if (this.previewRef.current) {
      this.previewRef.current.removeAttribute('src');
      this.previewRef.current.load();
    }
    this.setState({ status: CAMERA_STATUS.CLOSED });
    this.closeCamera();
  }

  componentDidMount() {
    this.handleOpenCamera();
  }

  handleError(error: Error) {
    this.setState({
      status: CAMERA_STATUS.ERROR,
    });
    console.error({ error });
  }

  async handleOpenCamera(): Promise<void> {
    
    try {
      if (this.recorder)
        await this.handleCloseCamera();
      this.setState({
        status: CAMERA_STATUS.INIT,
      });
      await faceApi.nets.tinyFaceDetector.load("/models/");
      await faceApi.loadFaceLandmarkTinyModel('/models')
      await this.openCamera();
      this.setState({
        status: CAMERA_STATUS.OPEN,
      });
      // this.detect(this.model);
    } catch (error: any) {
      this.handleError(error);
    }
  }

  async handleStartRecording(): Promise<void> {
    try {
      await this.recorder.startRecording();
      this.setState({
        status: CAMERA_STATUS.RECORDING,
      });
      if (this.props.options?.recordingLength) {
        const length = this.props.options.recordingLength * 1000;
        await new Promise((resolve) => setTimeout(resolve, length));
        await this.handleStopRecording();
        this.closeCamera();
      }
    } catch (error: any) {
      this.handleError(error);
    }
  }

  async handleStopRecording(): Promise<void> {
    try {
      await this.recorder.stopRecording();
      const blob = await this.recorder.getBlob();
      const preview = window.URL.createObjectURL(blob);
      if (this.previewRef.current) {
        this.previewRef.current.src = preview;
      }
      this.closeCamera();
      this.setState({
        status: CAMERA_STATUS.PREVIEW,
      });
    } catch (error: any) {
      this.handleError(error);
    }
  }

  async handleRetakeRecording(): Promise<void> {
    try {
      await this.handleOpenCamera();
    } catch (error: any) {
      this.handleError(error);
    }
  }

  async download(): Promise<void> {
    try {
      const blob = await this.recorder.getBlob();
      const filename = `${
        this.props.options?.filename || new Date().getTime()
      }.${this.props.options?.fileType || 'mp4'}`;
      saveFile(filename, blob);
    } catch (error: any) {
      this.handleError(error);
    }
  }

  async getRecording(): Promise<Blob | undefined> {
    try {
      return await this.recorder?.getBlob();
    } catch (error: any) {
      this.handleError(error);
      return;
    }
  }

  onPlay = async () => {
    if (
      this.webcamRef.current!.paused ||
      this.webcamRef.current!.ended ||
      !faceApi.nets.tinyFaceDetector.params
    ) {
      setTimeout(() => this.onPlay());
      return;
    }

    const options = new faceApi.TinyFaceDetectorOptions({
      inputSize: 512,
      scoreThreshold: 0.5
    });

    const useTinyModel = true

    const result = await faceApi
      .detectSingleFace(this.webcamRef.current!, options)
      .withFaceLandmarks(useTinyModel);

    if (result) {
      // console.log(result);
      console.log(result.landmarks.positions[28].x-result.landmarks.positions[1].x, result.landmarks.positions[16].x-result.landmarks.positions[28].x);
      const left = result.landmarks.positions[28].x-result.landmarks.positions[1].x;
      const right = result.landmarks.positions[16].x-result.landmarks.positions[28].x;
      const faceHeight = result.landmarks.positions[8].y-result.landmarks.positions[27].y;
      console.log("Height", faceHeight);
      if (left - right < -10 && this.props.options?.small === 1) {
        this.setState({
          large: true,
        });
      } else if (left - right > 10 && this.props.options?.small === 3) {
        this.setState({
          large: true,
        });
      } else if (this.props.options?.small === 2) {
        if (left-right > -10 && left-right < 10) {
          this.setState({
            large: true,
          });
        } else {
          this.setState({
            large: false,
          });
        }
      } else {
        this.setState({
          large: false,
        });
      }
      if(faceHeight<10) {
        this.props.options?.setMuteAudio(true);
      } else {
        this.props.options?.setMuteAudio(false);
      }
      
      this.setState({
        facesDetected: true,
      });
    } else {
      this.setState({
        facesDetected: false,
      });
      this.props.options?.setMuteAudio(true);
    }

    setTimeout(() => this.onPlay(), 1000);
  };

  render() {
    console.log(this.props.options)
    return (
      <>
        <style>
          {`
            .${this.props.cssNamespace}__wrapper {
              display: -webkit-box;
              display: -ms-flexbox;
              display: flex;
              -webkit-box-orient: vertical;
              -webkit-box-direction: normal;
              -ms-flex-flow: column nowrap;
                      flex-flow: column nowrap;
              -webkit-box-pack: justify;
              -ms-flex-pack: justify;
                      justify-content: space-between;
            }
            .${this.props.cssNamespace}__status {
              margin: 1rem 0;
            }
          `}
        </style>
        <div className={`${this.props.cssNamespace}__wrapper`}>
          {this.props?.render?.({
            openCamera: this.handleOpenCamera,
            closeCamera: this.handleCloseCamera,
            start: this.handleStartRecording,
            stop: this.handleStopRecording,
            retake: this.handleRetakeRecording,
            download: this.download,
            getRecording: this.getRecording,
            status: this.state.status,
          })}
          {
            this.state.status === CAMERA_STATUS.CLOSED ? 
            (
              <div 
                className = "videoOff-true"
                style={{
                  display: `flex`,
                  backgroundColor: 'black',
                  height: this.state.large ? '90px' : '180px',
                  width: this.state.large ? '150px' : '300px',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <div className="videoOffName">
                  {'SC'}
                </div>
              </div>
              
            ) : 
            (
              <>
                <Video
                  cssNamespace={this.props.cssNamespace}
                  style={{
                    display: `block`,
                    backgroundColor: 'black',
                    height: this.state.large ? '180px' : '90px',
                    width: this.state.large ? '300px' : '150px',
                  }}
                  onPlay={this.onPlay}
                  autoPlay
                  muted
                  loop
                  ref={this.webcamRef}
                />
                {/* <div
                  style={{
                    position: 'absolute',
                    top: '22%',
                    left: '40%',
                  }}>
                  {
                    !this.state.facesDetected && <h1>No Face Detected</h1>
                  }
                </div> */}
              </>
            )
          }
        </div>
      </>
    );
  }
}
