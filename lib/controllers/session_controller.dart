import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import './voice_controller.dart';

enum SessionState { idle, active, paused, recall, completed }

class SessionNotifier extends StateNotifier<SessionState> {
  final ApiService _api;
  final VoiceController _voice;
  int? _currentSessionId;
  String? _currentTopic;

  SessionNotifier(this._api, this._voice) : super(SessionState.idle);

  Future<void> startSession(int userId, String topic, String companionId) async {
    state = SessionState.active;
    _currentTopic = topic;
    final session = await _api.startSession(userId, topic, companionId);
    _currentSessionId = session['id'];
  }

  Future<void> stopSession(int duration, int interruptions) async {
    if (_currentSessionId == null) return;
    await _api.endSession(_currentSessionId!, duration, interruptions);
    state = SessionState.completed;
  }

  Future<void> analyzeRecall(File audioFile) async {
    if (_currentTopic == null) return;
    state = SessionState.recall;
    final result = await _api.analyzeRecall(_currentTopic!, audioFile);
    // Process results (update state/UI)
  }
}
