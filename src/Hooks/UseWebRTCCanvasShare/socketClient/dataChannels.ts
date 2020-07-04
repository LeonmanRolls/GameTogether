import {DataChannelMessage, DataChannels, PeerConnection} from "../../../types";
import {UpdateGameLog} from "./socketClient";


const normalizeMousePosition = (displayElement: HTMLCanvasElement | HTMLVideoElement, mouseEvent: MouseEvent) => {
    const displayElementWidth = displayElement.offsetWidth;
    const displayElementHeight = displayElement.offsetHeight;

    const normalizedWidth = mouseEvent.offsetX / displayElementWidth;
    const normalizedHeight = mouseEvent.offsetY / displayElementHeight;

    return { normalizedWidth, normalizedHeight };
};

const createMousePositionNetworkData = (
    normalizedMousePosition: any,
    connectionId: any,
) => {
    return JSON.stringify({...normalizedMousePosition, connectionId});
}

export const createKeypressNetworkData = (name: string, keyCode: number): DataChannelMessage => ({
    type: 'keypress',
    data: { name, keyCode }
});

const createMouseClickNetworkData = () => {

}

export const reliableBroadcast = (
    peerConnections: PeerConnection[],
    data: DataChannelMessage,
) => {
    peerConnections.forEach((peerConnection: PeerConnection) => {
        peerConnection.dataChannels.reliableDataChannel.send(JSON.stringify(data));
    });
};


export const fastBroadcast = (
    peerConnections: PeerConnection[],
    data: DataChannelMessage,
) => {
    peerConnections.forEach((peerConnection: PeerConnection) => {
        peerConnection.dataChannels.fastDataChannel.send(JSON.stringify(data));
    });
};

export const fastSend = (
    peerConnection: PeerConnection,
    data: DataChannelMessage,
) => {
    peerConnection.dataChannels.fastDataChannel.send(JSON.stringify(data));
};

type sendKeypressFn = (name: string, keyCode: number, dataChannel: any) => void;
const sendKeypress: sendKeypressFn = (name, keyCode, dataChannel) => {
    try {
        dataChannel.keyDataChannel.send(
            JSON.stringify({
                name,
                keyCode,
            })
        );
    } catch (e) {
        console.error('Failed to send keypress: ', e);
    }
};

export const createDataChannel = (
    pc: PeerConnection,
    canvas: HTMLCanvasElement,
    videoElement: HTMLVideoElement,
    isHost: boolean,
    updateGameLog: UpdateGameLog
): DataChannels => {

    const fastDataChannel = pc.createDataChannel('fast', {
        ordered: false,
        maxRetransmits: 0,
    });

    const reliableDataChannel = pc.createDataChannel('reliable');

    fastDataChannel.onerror = error => {
        console.log('Key Data Channel Error:', error);
    };
    fastDataChannel.onopen = () => {
    };
    fastDataChannel.onclose = () => {
        console.log('Key The Data Channel is Closed');
    };

    //@ts-ignore
    /*
    document.onclick = e => {
        console.log('onClick');
        try {
            keyDataChannel.send(e.clientX + ',' + e.clientY);
        } catch (e) {
            console.error('failed to send click');
        }
    };
     */

    fastDataChannel.onerror = error => {
        console.log('Mouse position Data Channel Error:', error);
    };
    fastDataChannel.onopen = () => {
        fastDataChannel.send('Mouse position Hello World!');
    };
    fastDataChannel.onclose = () => {
        console.log('Mouse position The Data Channel is Closed');
    };

    if (isHost) {
        canvas.addEventListener('mousemove', (e: MouseEvent) => {
            try {
                fastDataChannel.send(
                    createMousePositionNetworkData(normalizeMousePosition(canvas, e), pc.connectionId)
                );
            } catch (e) {
                console.error('failed to send mouse position: ', e);
            }
        });
    } else {
        videoElement.addEventListener('mousemove', e => {
            try {
                console.log('mousemove: ', e);
                fastDataChannel.send(
                    createMousePositionNetworkData(normalizeMousePosition(videoElement, e), pc.connectionId)
                );
            } catch (e) {
                console.error('failed to send mouse position');
            }
        });
    }

    return { fastDataChannel, reliableDataChannel };
};