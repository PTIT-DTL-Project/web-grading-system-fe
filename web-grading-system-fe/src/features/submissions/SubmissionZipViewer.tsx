import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Layout, Spin, Tree, Typography } from 'antd'
import { FileOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { Editor } from '@monaco-editor/react'
import { getSubmissionTree, getSubmissionFile } from '../../shared/api/endpoints/submissions'
import type { SubmissionZipTreeResponse, ZipTreeNode, SubmissionZipFileResponse } from '../../shared/types/submission'
import { useParams } from 'react-router'
import { useTranslation } from 'react-i18next'

export function SubmissionZipViewer() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const { t } = useTranslation()
  const [tree, setTree] = useState<SubmissionZipTreeResponse | null>(null)
  const [fileContent, setFileContent] = useState<SubmissionZipFileResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [fileLoading, setFileLoading] = useState<boolean>(false)
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])
  const editorRef = useRef<any>(null)

  const loadTree = useCallback(async () => {
    if (!submissionId) return
    setLoading(true)
    try {
      const data = await getSubmissionTree(submissionId)
      setTree(data)
    } catch (err) {
      console.error('Failed to load submission tree', err)
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    loadTree()
  }, [loadTree])

  const mimeToLanguage = (mime: string | undefined): string => {
    const map: Record<string, string> = {
      'text/x-java': 'java',
      'text/x-python': 'python',
      'text/javascript': 'javascript',
      'text/typescript': 'typescript',
      'text/markdown': 'markdown',
      'text/plain': 'plaintext',
      'application/json': 'json',
      'application/xml': 'xml',
      'text/html': 'html',
      'text/css': 'css',
      'text/x-kotlin': 'kotlin',
      'text/x-go': 'go',
      'text/x-rust': 'rust',
      'text/x-c': 'c',
      'text/x-cpp': 'cpp',
      'text/x-c++': 'cpp',
      'text/yaml': 'yaml',
      'text/toml': 'toml',
      'text/ini': 'ini',
      'text/x-sql': 'sql',
      'text/x-shellscript': 'shell',
      'text/x-batch': 'batch',
    }
    return map[mime || ''] || 'plaintext'
  }

  if (loading) {
    return <Spin size="large" />
  }

  if (!tree) {
    return null
  }

  const rootNode = tree.root
  if (!rootNode) {
    return null
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Layout.Sider width={280} style={{ overflow: 'auto', borderRight: '1px solid #f0f0f0' }}>
        <Typography.Title level={5} style={{ margin: 16, marginBottom: 8 }}>
          {rootNode.name}
        </Typography.Title>
        <Tree
          blockNode
          expandedKeys={expandedKeys}
          onExpand={(expandedKeys: React.Key[]) => {
            setExpandedKeys(expandedKeys)
          }}
          onSelect={(_selectedKeys, info) => {
            const node = info.node as unknown as ZipTreeNode
            if (!submissionId || node.type !== 'file') return
            setSelectedKey(node.path)
            setFileLoading(true)
            getSubmissionFile(submissionId, node.path)
              .then((data) => {
                setFileContent(data)
              })
              .catch((err) => {
                console.error('Failed to load file content', err)
              })
              .finally(() => {
                setFileLoading(false)
              })
          }}
          selectedKeys={selectedKey ? [selectedKey] : []}
          showIcon
        >
          {rootNode.children?.map((node: ZipTreeNode) => (
            <Tree.TreeNode
              key={node.path}
              title={node.name}
              icon={node.type === 'file' ? <FileOutlined /> : <FolderOpenOutlined />}
            />
          ))}
        </Tree>
      </Layout.Sider>
      <Layout.Content style={{ padding: 24, overflow: 'auto' }}>
        {fileLoading ? (
          <Spin size="large" />
        ) : fileContent ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                {fileContent.path}
              </Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {fileContent.isBinary ? 'application/octet-stream' : fileContent.mime}
                {' | '}
                {fileContent.size} bytes
              </Typography.Text>
            </div>
            {fileContent.isBinary ? (
              <Alert
                message={t('submission.binaryFile', 'File nhị phân, không thể xem trước')}
                description={fileContent.message}
                type="info"
                showIcon
              />
            ) : (
              <Editor
                height="100%"
                language={mimeToLanguage(fileContent.mime)}
                value={fileContent.content || ''}
                theme="vs-light"
                options={{
                  readOnly: true,
                  minimap: { enabled: true },
                  wordWrap: 'on',
                  fontSize: 14,
                  lineNumbers: 'on',
                }}
                onMount={(editor) => {
                  editorRef.current = editor
                }}
              />
            )}
          </div>
        ) : (
          <Alert message={t('submission.loadError', 'Không tải được nội dung file')} type="error" showIcon />
        )}
      </Layout.Content>
    </Layout>
  )
}

export default SubmissionZipViewer
