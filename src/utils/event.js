class Event{
    static preventDefault(e) {
        if (e.preventDefault) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }
        return this;
    }

    static stop(e) {
        preventDefault(e);
        stopPropagation(e);
        return this;
    }
}
export default Event;