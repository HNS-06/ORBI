import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';

class ApiService {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: 'http://localhost:8000', // Update for production
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 30),
  ));

  Future<Map<String, dynamic>> startSession(int userId, String topic, String companionId) async {
    final resp = await _dio.post('/sessions/start', queryParameters: {
      'user_id': userId,
      'topic': topic,
      'companion_id': companionId,
    });
    return resp.data;
  }

  Future<Map<String, dynamic>> endSession(int sessionId, int duration, int interruptions) async {
    final resp = await _dio.post('/sessions/$sessionId/end', queryParameters: {
      'duration': duration,
      'interruptions': interruptions,
    });
    return resp.data;
  }

  Future<Response> voiceChat({
    required File audioFile,
    required String topic,
    required List<Map<String, String>> history,
    String memoryContext = '',
  }) async {
    FormData formData = FormData.fromMap({
      'audio': await MultipartFile.fromFile(audioFile.path, filename: 'input.m4a'),
      'topic': topic,
      'history_json': jsonEncode(history),
      'memory_context': memoryContext,
    });

    return await _dio.post('/ai/voice-chat', data: formData);
  }

  Future<Map<String, dynamic>> analyzeRecall(String topic, File audioFile) async {
    FormData formData = FormData.fromMap({
      'topic': topic,
      'audio': await MultipartFile.fromFile(audioFile.path, filename: 'recall.m4a'),
    });

    final resp = await _dio.post('/ai/analyze-recall', data: formData);
    return resp.data;
  }
}
