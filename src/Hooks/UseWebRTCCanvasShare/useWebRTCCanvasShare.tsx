/*
GameTogether © Copyright, Nang Development Limited 2020. All Rights Reserved.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {useEffect, useState, useRef} from 'react';
import initSocketClient from "./socketClient/socketClient";
import {PeerConnection, UpdateGameLog} from "../../types";

const updateGameLogFactory = (setGameLog: any) => (nextMessage: string) => {
    setGameLog((gameLog: string[]) => {
        if (gameLog.length < 10) {
            return [...gameLog, nextMessage];
        }
        return [...gameLog.slice(1, gameLog.length), nextMessage];
    });
};

const initElementReferences = (
    myIframe: HTMLIFrameElement,
    remoteCursorId: string,
    remoteVideoId: string,
    canvasId: string
) => {
    const canvass = myIframe?.contentWindow?.document.getElementById(canvasId) as HTMLCanvasElement;
    const cursor = document.querySelector('#' + remoteCursorId) as HTMLElement;
    const remoteVideo = document.querySelector('#' + remoteVideoId) as HTMLVideoElement;

    return ({canvass, cursor, remoteVideo});
}

interface Return {
    isGuest: boolean;
    start: () => void;
    stop: React.MutableRefObject<() => void>;
    gameLog: string[];
}

const positionMouseContainer = (canvas: HTMLCanvasElement, iFrame: HTMLIFrameElement) => {
    let canvasContainer = iFrame?.contentWindow?.document.querySelectorAll('[data-canvas-container="true"]')[0] as HTMLElement;
    const canvasComputedStyle = iFrame.contentWindow?.getComputedStyle(canvas);

    if (!canvasComputedStyle) {
        console.error('unable to computer canvas style');
        return;
    }
    const hasFixedPosition = canvasComputedStyle?.position === 'fixed';

    if(hasFixedPosition) {
        canvasContainer.style.position = 'fixed';

        setTimeout(() => {
            canvasContainer.style.top = canvasComputedStyle.top;
            canvasContainer.style.right = canvasComputedStyle.right;
            canvasContainer.style.bottom = canvasComputedStyle.bottom;
            canvasContainer.style.left = canvasComputedStyle.left;
        }, 2000);
    }
}

const useWebRTCCanvasShare = (
    iframeId: string,
    remoteCursorId: string,
    remoteVideoId: string,
    socketUrl: string | undefined,
    roomId: string,
    canvasId: string,
    containerElement: React.Ref<HTMLElement>,
    startOnLoad: boolean = true,
    userName: string = 'someone'
): Return => {
    const [hasInit, setHasInit] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const [hasStart, setHasStart] = useState(startOnLoad);
    const [gameLog, setGameLog] = useState<string[]>(['one', 'two', 'three']);
    const externalStop = useRef<() => void>(() => {console.error('externalStop not inited')});
    const updateGameLog: UpdateGameLog = updateGameLogFactory(setGameLog);
    const peerConnections: PeerConnection[] = [];

    //This is so consumer can control when the hook starts
    const start = () => {
        if (!hasStart) {
            setHasStart(true);
        }
    };

    useEffect(() => {
        const myIframe = document.getElementById(iframeId) as HTMLIFrameElement;

        if (hasStart && !hasInit) {
            setHasInit(true);

            const onIframeLoaded = () => {
                if (!roomId) {
                    console.error('no roomid');
                    return;
                }

                const {canvass, cursor, remoteVideo} = initElementReferences(
                    myIframe,
                    remoteCursorId,
                    remoteVideoId,
                    canvasId
                );
                positionMouseContainer(canvass, myIframe);

                externalStop.current = initSocketClient(
                    roomId,
                    peerConnections,
                    myIframe,
                    cursor,
                    remoteVideo,
                    canvass,
                    updateGameLog,
                    userName,
                    setIsGuest,
                    socketUrl,
                    externalStop,
                    containerElement
                );
            };

            myIframe.addEventListener('load', onIframeLoaded);
        }
    }, [hasStart, hasInit]);

    useEffect(() => {
        return () => {
            if (externalStop.current){
                externalStop.current();
            }
        };
    }, []);

    return {isGuest, start, stop: externalStop, gameLog};
};

export default useWebRTCCanvasShare;
