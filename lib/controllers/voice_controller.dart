import 'dart:io';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';

class VoiceController {
  FlutterSoundRecorder? _recorder;
  bool _isRecorderInitialised = false;

  Future<void> init() async {
    final status = await Permission.mic.request();
    if (status != PermissionStatus.granted) {
      throw 'Microphone permission not granted';
    }

    _recorder = FlutterSoundRecorder();
    await _recorder!.openRecorder();
    _isRecorderInitialised = true;
  }

  Future<void> startRecording() async {
    if (!_isRecorderInitialised) return;
    Directory tempDir = await getTemporaryDirectory();
    String path = '${tempDir.path}/audio_input.m4a';
    await _recorder!.startRecorder(toFile: path);
  }

  Future<File?> stopRecording() async {
    if (!_isRecorderInitialised) return null;
    String? path = await _recorder!.stopRecorder();
    if (path != null) {
      return File(path);
    }
    return null;
  }

  void dispose() {
    _recorder?.closeRecorder();
    _recorder = null;
    _isRecorderInitialised = false;
  }
}
