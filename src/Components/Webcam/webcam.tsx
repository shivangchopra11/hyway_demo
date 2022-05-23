import { Component } from "react";
import { RecordWebcam } from './record-webcam';


type VideoProps = {
  showVideo: boolean;
  muteAudio: boolean;
  small: number;
  setMuteAudio: any;
};

export class WebcamComponent extends Component<VideoProps, any> {

    constructor(props: any) {
        super(props);
        console.log(this.props);
        this.state = {
            options: {
                filename: 'test-filename',
                fileType: 'mp4',
                width: 167,
                height: 100,
                aspectRatio: 1.777777778,
                captureVideo: this.props.showVideo,
                captureAudio: !this.props.muteAudio,
                small: this.props.small,
                setMuteAudio: this.props.setMuteAudio,
            },
            constraints: {

            },
            enter: 1,
        };
    }

    componentWillReceiveProps(nextProps: any) {
        this.setState({
            options: {
                filename: 'test-filename',
                fileType: 'mp4',
                width: 167,
                height: 100,
                aspectRatio: 1.777777778,
                captureVideo: nextProps.showVideo,
                captureAudio: !nextProps.muteAudio,
                small: nextProps.small,
                setMuteAudio: nextProps.setMuteAudio,
            }
        });
        this.forceUpdate();
      }

    render() {
        return (
            <div>
                <div className="demo-section">
                    <RecordWebcam options={this.state.options} />
                </div>
            </div>
        );
    }
    
}