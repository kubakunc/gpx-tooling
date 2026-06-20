package com.velologiclabs.gpxtools;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

/**
 * Lets the user pick where to save a file via the Android Storage Access
 * Framework ("Create document" system browser). Unlike Filesystem.writeFile —
 * which writes to a fixed app/Documents directory with no chooser — this opens
 * the native file browser so the user selects the destination folder + name.
 */
@CapacitorPlugin(name = "FileSaver")
public class FileSaverPlugin extends Plugin {

    /**
     * Launch the system "Create document" browser. The base64 `data` is retained
     * on the saved PluginCall and written to the chosen URI in the callback.
     */
    @PluginMethod
    public void saveFile(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("Missing file data");
            return;
        }
        String filename = call.getString("filename", "track.gpx");
        String mimeType = call.getString("mimeType", "application/octet-stream");

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, filename);

        startActivityForResult(call, intent, "handleSaveResult");
    }

    @ActivityCallback
    private void handleSaveResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        // User dismissed the browser without choosing a destination.
        if (result.getResultCode() != Activity.RESULT_OK
                || result.getData() == null
                || result.getData().getData() == null) {
            JSObject ret = new JSObject();
            ret.put("uri", "");
            ret.put("cancelled", true);
            call.resolve(ret);
            return;
        }

        Uri uri = result.getData().getData();
        try {
            byte[] bytes = Base64.decode(call.getString("data"), Base64.DEFAULT);
            OutputStream out = getContext().getContentResolver().openOutputStream(uri);
            if (out == null) {
                call.reject("Could not open destination for writing");
                return;
            }
            try {
                out.write(bytes);
                out.flush();
            } finally {
                out.close();
            }
            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            ret.put("cancelled", false);
            call.resolve(ret);
        } catch (Exception e) {
            // ACTION_CREATE_DOCUMENT already created the (now empty/partial) file,
            // so remove it on failure to avoid leaving a 0-byte file behind.
            try {
                DocumentsContract.deleteDocument(getContext().getContentResolver(), uri);
            } catch (Exception ignored) {
                // Best-effort cleanup; report the original write error regardless.
            }
            call.reject("Could not write file: " + e.getMessage());
        }
    }
}
