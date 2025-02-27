import { EventDispatcher } from '../utils';
import { CapableElement, DIRECTION, dirOptions, ResolvedOptions } from "./options";
import { applyNewDomain, clamp, scaleK } from './utils';

export class ChartZoomWheel {
    public scaleUpdated = new EventDispatcher();

    constructor(private el: CapableElement, private options: ResolvedOptions) {
        el.addEventListener('wheel', ev => this.onWheel(ev));
    }

    private onWheel(event: WheelEvent) {
        event.preventDefault();

        let deltaX = event.deltaX;
        let deltaY = event.deltaY;
        switch (event.deltaMode) {
            case 1: // line
                deltaX *= 30;
                deltaY *= 30;
                break;
            case 2: // page
                deltaX *= 400;
                deltaY *= 400;
                break;
        }
        const transform = {
            [DIRECTION.X]: {
                translate: 0,
                zoom: 0,
            },
            [DIRECTION.Y]: {
                translate: 0,
                zoom: 0,
            }
        };
        /*
        if (event.ctrlKey || event.metaKey) { // zoom
            if (event.altKey) { // ctrl + alt + wheel = y zoom
                transform[DIRECTION.X].zoom = deltaX;
                transform[DIRECTION.Y].zoom = deltaY;
            } else { // ctrl + wheel = x zoom
                transform[DIRECTION.X].zoom = (deltaX + deltaY);
            }
        } else { // translate
            if (event.altKey) { // alt + wheel = y translate
                transform[DIRECTION.X].translate = deltaX;
                transform[DIRECTION.Y].translate = deltaY;
            } else { // wheel = x translate
                transform[DIRECTION.X].translate = (deltaX + deltaY);
            }
        }

         */
        // wheel = x+y zoom
        if (!(event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
            transform[DIRECTION.X].zoom = (deltaX + deltaY);
            transform[DIRECTION.Y].zoom = deltaY;
        }

        // ctrl + wheel = x zoom
        if (!event.altKey && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
            transform[DIRECTION.X].zoom = (deltaX + deltaY);
        }

        // shift + wheel = y zoom
        if (event.shiftKey && ! (event.ctrlKey || event.metaKey) && ! event.altKey) {
            transform[DIRECTION.X].zoom = deltaX;
            transform[DIRECTION.Y].zoom = deltaY;
        }


        const boundingRect = this.el.getBoundingClientRect();
        const origin = {
            [DIRECTION.X]: event.clientX - boundingRect.left,
            [DIRECTION.Y]: event.clientY - boundingRect.top,
        }

        let changed = false;
        for (const { dir, op } of dirOptions(this.options)) {
            const domain = op.scale.domain();
            const k = scaleK(op.scale);
            const trans = transform[dir];
            const transOrigin = op.scale.invert(origin[dir]);
            trans.translate *= k;
            trans.zoom *= 0.002;
            if (event.shiftKey) {
                trans.translate *= 5;
                trans.zoom *= 5;
            }

            const extent = domain[1] - domain[0];
            const translateCap = 0.4 * extent;
            trans.translate = clamp(trans.translate, -translateCap, translateCap);

            const zoomCap = 0.5;
            trans.zoom = clamp(trans.zoom, -zoomCap, zoomCap);

            const newDomain = domain.map(d => d + trans.translate + (d - transOrigin) * trans.zoom);
            if (applyNewDomain(op, newDomain)) {
                changed = true;
            }
        }

        if (changed) {
            this.scaleUpdated.dispatch();
        }
    }
}
