// Measure and Label Improved
// 
// This script will measure the length of current line selection 
// and then label it with its length. The line/label will 
// be saved non-destructively to overlay or ROI manager. 
// Users will also be given a dialog box to update the properties 
// of the line/label such as color and size. 
//
// Why use this script over existing Measure and Label macro (https://imagej.nih.gov/ij/plugins/measure-label.html)? 
// The alternate macro creates a label/annotation, but that label is a "measurement" number or a manually set label 
// and does NOT include the actual length of the line selection. 
// This script will actually measure the line selection and create a label with it's length. 
//
// Licence: GPL-3.0-or-later 
// Author: https://github.com/01baftb 

importClass(Packages.ij.IJ);
importClass(Packages.ij.WindowManager);
importClass(Packages.ij.plugin.frame.RoiManager);
importClass(Packages.ij.gui.NonBlockingGenericDialog);
importClass(Packages.ij.gui.RoiProperties);
importClass(Packages.ij.gui.DialogListener);
importClass(Packages.java.awt.Color);
importClass(Packages.java.awt.Font);
importClass(Packages.ij.gui.Toolbar);
importClass(Packages.ij.measure.Calibration);
importClass(Packages.ij.gui.TextRoi);
importClass(Packages.ij.gui.Overlay);


img = WindowManager.getCurrentImage();

// Get current overlay instance so it can be used later 
current_overlay = img.getOverlay();
// If the current image doesn't already have an overlay, then create a new overlay. 
if (current_overlay == null) {
    current_overlay = new Overlay();
    img.setOverlay(current_overlay);
}

// Get info about the image 
img_height_px = img.getHeight();
img_width_px = img.getWidth();
img_calib = img.getCalibration()
img_unit = img_calib.getUnit()
img_width_unit = img_calib.getX(img_width_px);
img_height_unit = img_calib.getY(img_height_px);

// For debuging: Print info about image 
print('Image in [px] is ' + img_width_px + 'x' + img_height_px)
print('Image in [' + img_unit + '] is ' + img_width_unit + 'x' + img_height_unit)

// Default properties for ROI 
var line_width = 3;
var line_color = 'white';
var text_color = 'white';
var text_font_size = 72;
var text_location = 'center';
var text_line_length_digits = 1;
var set_as_overlay = true;

useSmartDefaultSize = true;
if (useSmartDefaultSize) {
    // Scale the font size and stroke width on the line 
    // based on the image height (px)
    // https://forum.image.sc/t/understanding-the-font-size-when-inserting-scale-bar/19913/2?u=01baftb 
    scale_line_width = 200
    scale_font = 35

    line_width = Math.ceil(img_height_px / scale_line_width)
    text_font_size = Math.ceil(img_height_px / scale_font)
}


roi = img.getRoi(); // https://stackoverflow.com/a/35225648/4988010

handleROI(roi);

function handleROI(roi) {

    if (roi == null || !roi.isLine()) {
        print("Only line selection currenlty supported");
        return; // Exit script if selection is not a line 
    }

    print('Drawn roi is part of overlay? ' + roi.isActiveOverlayRoi())
    current_overlay.add(roi) // Add roi line to overlay
    print('Drawn roi is part of overlay? ' + roi.isActiveOverlayRoi())


    roi.setStrokeWidth(line_width); // Set the default stroke width for line roi
    roi.setStrokeColor(Color[line_color]); // Set the default color for line roi

    print('Coords for line roi are: ' + 'x1 ' + roi.x1 + ' y1 ' + roi.y1 + ' x2 ' + roi.x2 + ' y2 ' + roi.y2);

    // Set the coordinates for the text position 
    text_pos = getTextLocationCoords(text_location);
    text_pos_x = text_pos.x;
    text_pos_y = text_pos.y;

    // Set the text value based on length of line 
    line_length = roi.getLength(); // Get length of line
    text_line_length = IJ.d2s(line_length, text_line_length_digits) + ' ' + img_unit // Set text to equal length of line 
    print('Length of line is: ' + line_length);


    // Create text roi with length of the line roi 
    plain_font = new Font("Serif", Font.BOLD, text_font_size);
    roi_text = new TextRoi(text_pos_x, text_pos_y, text_line_length, plain_font);
    roi_text.setStrokeColor(Color[text_color]) // Set default color for the text roi 


    print('Drawn roi_text is part of overlay? ' + roi_text.isActiveOverlayRoi())
    current_overlay.add(roi_text) // Add roi text to overlay
    print('Drawn roi_text is part of overlay? ' + roi_text.isActiveOverlayRoi())

    // Update/referesh image to show changes 
    img.updateAndRepaintWindow(); // https://imagej.nih.gov/ij/developer/api/ij/ImagePlus.html#updateAndRepaintWindow--

    changeListener = new DialogListener {
        dialogItemChanged: function(gd, event) {
            print('Inside: dialogItemChanged');

            line_width = gd.getNextNumber();
            line_color = gd.getNextString();
            text_font_size = gd.getNextNumber();
            text_color = gd.getNextString();
            text_location = gd.getNextChoice();
            text_line_length_digits = gd.getNextNumber();
            set_as_overlay = gd.getNextBoolean();

            updateROI(); // Update proprties of roi 

            return true;
        }
    };

    startUpListener = new DialogListener {
        dialogItemChanged: function(gd, event) {
            print('Dialog box was launched');
            return true;
        }
    };


    gd = new NonBlockingGenericDialog("ROI Properties Update")
    gd.addNumericField("Line width", line_width, 0);
    gd.addStringField("Line color", line_color);
    gd.addNumericField("Font size", text_font_size, 0);
    gd.addStringField("Text color", text_color);
    gd.addChoice('Text location', ['top', 'center', 'bottom'], text_location);
    gd.addNumericField("Significant figures", text_line_length_digits, 0);
    gd.addCheckbox('Save to overlay?', set_as_overlay);
    gd.addDialogListener(startUpListener);
    gd.addDialogListener(changeListener);
    gd.showDialog()


    print('Was dialog OKed? ' + gd.wasOKed());
    print('Was dialog Canceled?  ' + gd.wasCanceled());

    if (gd.wasOKed()) {
        // User clicked OK on the dialog 
        print('User clicked OK on the dialog box ');

        if (!set_as_overlay) {
            // If user doesn't want to save to overlay, 
            // then only add to ROI manager

            current_overlay.remove(roi);
            current_overlay.remove(roi_text);

            // Get the ROI manager instance 
            current_roimanager = RoiManager.getInstance();
            if (current_roimanager == null)
                current_roimanager = new RoiManager();

            current_roimanager.addRoi(roi);
            current_roimanager.addRoi(roi_text);
        }

    }
    else {
        // User canceled the dialog box
        print('User closed or clicked CANCEL on the dialog box ');

        // Remove the ROI from overlay 
        current_overlay.remove(roi);
        current_overlay.remove(roi_text);

    }


    function updateROI() {

        // Update properties of roi
        roi.setStrokeWidth(line_width);
        roi.setStrokeColor(Color[line_color]);

        // Update the text in case user change teh significant digits 
        line_length = roi.getLength(); // Get length of line
        text_line_length = IJ.d2s(line_length, text_line_length_digits) + ' ' + img_unit // Set text to equal length of line 
        current_overlay.remove(roi_text);

        // Update properties of text roi 
        plain_font = new Font("Serif", Font.BOLD, text_font_size);
        roi_text = new TextRoi(text_pos_x, text_pos_y, text_line_length, plain_font);
        current_overlay.add(roi_text);
        roi_text.setCurrentFont(plain_font);
        roi_text.setStrokeColor(Color[text_color]);
        text_pos = getTextLocationCoords(text_location);
        text_pos_x = text_pos.x;
        text_pos_y = text_pos.y;
        roi_text.setLocation(text_pos_x, text_pos_y);

        // Update/referesh image to show changes 
        img.updateAndRepaintWindow(); // https://imagej.nih.gov/ij/developer/api/ij/ImagePlus.html#updateAndRepaintWindow--

    }

    function getTextLocationCoords(location) {
        pos_x = 0;
        pos_y = 0;

        if (location == 'center') {
            // Position the text at the center of the line 
            pos_x = (roi.x2 - roi.x1) / 2 + roi.x1;
            pos_y = (roi.y2 - roi.y1) / 2 + roi.y1;
        }

        if (location == 'top') {
            // Position the text at the start of the line 
            pos_x = roi.x1;
            pos_y = roi.y1;
        }

        if (location == 'bottom') {
            // Position the text at the start of the line 
            pos_x = roi.x2;
            pos_y = roi.y2;
        }

        return { x: pos_x, y: pos_y };
    }

}

// References: 
// How do you label a line measurement with its length? http://imagej.1557.x6.nabble.com/How-do-you-label-a-line-measurement-with-its-length-tp5012782p5012801.html
// https://imagej.nih.gov/ij/developer/api/index.html 
// https://imagej.net/Scripting 
// https://imagej.net/JavaScript_Scripting 